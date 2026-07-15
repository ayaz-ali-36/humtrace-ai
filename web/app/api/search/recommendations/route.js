import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreReportPair } from "@/lib/recommendations";
import { getSettings } from "@/lib/settings";
import { validateImageBytes, validateImageFile } from "@/lib/upload-storage";
import { englishTextEmbeddingActive } from "@/lib/ai/config";
import { englishTextSimilarityScores } from "@/lib/ai/text-embeddings";

const clean = (value, max = 1200) => typeof value === "string" ? value.trim().slice(0, max) : "";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const settings = await getSettings();
    if (!settings.publicSearchEnabled || settings.maintenanceMode) {
      return NextResponse.json({ error: "Smart Search is temporarily unavailable." }, { status: 503 });
    }

    const form = await request.formData();
    const photo = form.get("photo");
    const hasPhoto = photo && typeof photo.arrayBuffer === "function" && photo.size > 0;
    if (hasPhoto) {
      const error = validateImageFile(photo);
      if (error) return NextResponse.json({ error }, { status: 400 });
      const bytes = Buffer.from(await photo.arrayBuffer());
      const byteError = validateImageBytes({ bytes, mimeType: photo.type });
      if (byteError) return NextResponse.json({ error: byteError }, { status: 400 });
    }

    const source = {
      type: "MISSING",
      approximateAge: clean(form.get("age"), 40),
      gender: clean(form.get("gender"), 30),
      heightCm: Number(form.get("heightCm")) || null,
      weightKg: Number(form.get("weightKg")) || null,
      broadRegion: clean(form.get("region"), 120),
      specificLocation: clean(form.get("location"), 180),
      description: clean(form.get("description")),
      clothing: clean(form.get("clothing"), 500),
      identifyingFeatures: clean(form.get("identifyingFeatures"), 500)
    };
    const hasDetails = Boolean(
      source.approximateAge ||
      source.gender ||
      source.heightCm ||
      source.weightKg ||
      source.broadRegion ||
      source.description ||
      source.clothing ||
      source.identifyingFeatures
    );
    if (!hasPhoto && !hasDetails) {
      return NextResponse.json({ error: "Add a photograph, descriptive details, or both." }, { status: 400 });
    }
    if (!hasDetails) {
      return NextResponse.json({
        ok: true,
        recommendations: [],
        photoAccepted: true,
        aiAssistance: {
          englishTextEmbeddingUsed: false,
          imageEmbeddingUsed: false,
          developmentOnly: true,
          evaluationStatus: "Deferred"
        },
        notice: "The photograph was validated and discarded, but image similarity is not implemented in this development slice. Add English descriptive details for text assistance."
      });
    }

    const candidates = await prisma.report.findMany({
      where: {
        type: "UNIDENTIFIED",
        visibility: "PUBLIC",
        publicVisible: true,
        status: { not: "HIDDEN" }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    let textContext = { scores: new Map(), used: false, reason: "" };
    if (englishTextEmbeddingActive(settings)) {
      try {
        textContext = await englishTextSimilarityScores(source, candidates);
      } catch (error) {
        console.error("Development English text assistance unavailable", error.message);
        textContext.reason = "The local English text service is unavailable; deterministic details were used.";
      }
    }

    const threshold = textContext.used
      ? Math.max(settings.recommendationDisplayThreshold, settings.englishTextEmbeddingThreshold)
      : settings.recommendationDisplayThreshold;
    const recommendations = candidates
      .map((target) => ({
        target,
        result: scoreReportPair(source, target, {
          textEmbeddingScore: textContext.scores.get(target.id)
        })
      }))
      .filter((item) => item.result.score > 0 && item.result.score >= threshold)
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, 5)
      .map(({ target, result }) => ({
        id: "search-" + target.publicId,
        reportId: "Smart Search",
        similarReportId: target.publicId,
        score: result.score,
        qualityLabel: result.qualityLabel,
        status: "Search result",
        breakdown: result.breakdown,
        attributes: result.sharedAttributes,
        textEmbeddingUsed: result.textEmbeddingUsed,
        evaluationStatus: result.textEmbeddingUsed ? "Deferred" : null,
        explanation: result.explanation + (hasPhoto ? " The uploaded photograph was validated but was not analyzed or stored." : ""),
        targetReport: {
          type: "Unidentified Individual",
          age: target.approximateAge,
          gender: target.gender || "Not specified",
          region: target.broadRegion || "Not specified",
          description: target.description
        }
      }));

    let notice;
    if (textContext.used) {
      notice = recommendations.length
        ? "Development-only English text embeddings and structured details produced possible recommendations. Evaluation is deferred; human review is required."
        : "No possible recommendation met the development English text threshold. Evaluation is deferred."
    } else {
      notice = recommendations.length
        ? "Deterministic detail-based possible recommendations are shown. " + (textContext.reason || "English text embeddings were not used.")
        : "No detail-based possible recommendations met the current threshold. " + (textContext.reason || "");
    }

    return NextResponse.json({
      ok: true,
      recommendations,
      photoAccepted: hasPhoto,
      aiAssistance: {
        englishTextEmbeddingUsed: textContext.used,
        imageEmbeddingUsed: false,
        developmentOnly: true,
        evaluationStatus: "Deferred"
      },
      notice
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to complete Smart Search." }, { status: 500 });
  }
}
