export const reports = [
  {
    id: "MP-2026-0047",
    type: "Missing Person",
    name: "Ali Khan",
    age: "25",
    gender: "Female",
    region: "Skardu, GB",
    date: "June 2026",
    status: "Report Under Review",
    visibility: "Public",
    description: "Medium height, dark hair, blue scarf, limited public details.",
    recommendations: 3,
    score: 88
  },
  {
    id: "UI-2026-0001",
    type: "Unidentified Individual",
    name: "Sample Report",
    age: "25",
    gender: "Male",
    region: "Karachi, Sindh",
    date: "May 2026",
    status: "Content Review Completed",
    visibility: "Public",
    description: "Average build, brown jacket, respectful limited public summary.",
    recommendations: 2,
    score: 78
  },
  {
    id: "MP-2026-0052",
    type: "Missing Person",
    name: "Sara Ahmed",
    age: "17",
    gender: "Male",
    region: "Lahore, Punjab",
    date: "April 2026",
    status: "Potential Matches Available",
    visibility: "Hidden",
    description: "Tall, glasses, black coat, information restricted by reporter preference.",
    recommendations: 4,
    score: 67
  },
  {
    id: "UI-2026-0007",
    type: "Unidentified Individual",
    name: "Sample Report",
    age: "18",
    gender: "Female",
    region: "Islamabad",
    date: "July 2026",
    status: "Report Submitted",
    visibility: "Public",
    description: "Short hair, green shawl, no private details shown.",
    recommendations: 0,
    score: 72
  }
];

export const recommendations = [
  {
    id: "REC-204",
    reportId: "MP-2026-0047",
    similarReportId: "UI-2026-0001",
    score: 78,
    quality: "Strong Similarity",
    region: "Punjab and Sindh",
    attributes: ["Approximate age range", "Clothing description", "Timeline proximity"],
    breakdown: [
      { label: "Face Similarity", value: 84 },
      { label: "Age Proximity", value: 90 },
      { label: "Location Proximity", value: 60 },
      { label: "Description Match", value: 75 },
      { label: "Overall Score", value: 82 }
    ]
  },
  {
    id: "REC-318",
    reportId: "MP-2026-0052",
    similarReportId: "UI-2026-0007",
    score: 61,
    quality: "Moderate Similarity",
    region: "Khyber Pakhtunkhwa and Islamabad Capital Territory",
    attributes: ["Shared clothing notes", "Approximate month", "Reporter-provided details"],
    breakdown: [
      { label: "Face Similarity", value: 71 },
      { label: "Age Proximity", value: 64 },
      { label: "Location Proximity", value: 95 },
      { label: "Description Match", value: 77 },
      { label: "Overall Score", value: 76 }
    ]
  }
];

export const connectionRequests = [
  {
    id: "CR-102",
    direction: "Incoming",
    status: "Pending",
    relatedReportId: "MP-2026-0047",
    region: "Punjab",
    score: 78,
    message: "I would like to compare limited report details through the consent process.",
    date: "Jul 08, 2026",
    contact: "Hidden until acceptance"
  },
  {
    id: "CR-088",
    direction: "Outgoing",
    status: "Accepted",
    relatedReportId: "UI-2026-0001",
    region: "Sindh",
    score: 71,
    message: "Request accepted after reporter review.",
    date: "Jul 04, 2026",
    contact: "Limited contact information may now be shared according to preferences."
  },
  {
    id: "CR-071",
    direction: "Outgoing",
    status: "Declined",
    relatedReportId: "MP-2026-0052",
    region: "Khyber Pakhtunkhwa",
    score: 55,
    message: "Reporter declined the request.",
    date: "Jun 30, 2026",
    contact: "Hidden until acceptance"
  }
];

export const notifications = [
  "New potential match available",
  "Contact request received",
  "Contact request accepted",
  "Report status updated",
  "Privacy settings reminder"
];

export const users = [
  { name: "Demo Reporter", email: "ayesha@example.com", role: "Reporter", region: "Punjab", date: "Jan 2026", reports: 2, status: "Active" },
  { name: "Sara Ahmed", email: "sara@example.com", role: "Reporter", region: "Sindh", date: "Feb 2026", reports: 1, status: "Active" },
  { name: "Demo Admin", email: "admin@humtrace.demo", role: "Administrator", region: "Islamabad Capital Territory", date: "Mar 2026", reports: 0, status: "Active" }
];

export const auditLogs = [
  { time: "2026-07-10 09:20", user: "Demo Reporter", role: "Reporter", action: "Report submitted", resource: "HT-M-2026-001", status: "Completed" },
  { time: "2026-07-09 14:05", user: "System UI Preview", role: "Administrator", action: "Potential match generated", resource: "REC-204", status: "Demonstration Only" },
  { time: "2026-07-08 16:44", user: "Sara Ahmed", role: "Family Member", action: "Contact request sent", resource: "CR-102", status: "Pending" },
  { time: "2026-07-04 11:12", user: "Demo Reporter", role: "Family Member", action: "Contact request accepted", resource: "CR-088", status: "Completed" }
];

export const chartReportsByCity = [
  { name: "Lahore", reports: 12 },
  { name: "Karachi", reports: 9 },
  { name: "Islamabad", reports: 7 },
  { name: "Peshawar", reports: 5 },
  { name: "Quetta", reports: 4 }
];

export const chartReportsByMonth = [
  { month: "Mar", missing: 8, unidentified: 4 },
  { month: "Apr", missing: 10, unidentified: 6 },
  { month: "May", missing: 9, unidentified: 8 },
  { month: "Jun", missing: 14, unidentified: 7 },
  { month: "Jul", missing: 11, unidentified: 5 }
];
