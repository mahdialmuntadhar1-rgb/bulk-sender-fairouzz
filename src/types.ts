export enum LeadStage {
  NEW = "New",
  SENT = "Sent",
  DELIVERED = "Delivered",
  READ = "Read",
  REPLIED = "Replied",
  INTERESTED = "Interested",
  FOLLOW_UP = "Follow-up needed",
  REGISTERED = "Registered",
  NOT_INTERESTED = "Not interested",
  BAD_NUMBER = "Bad number"
}

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
  ctaType: "reply_1" | "visit_link" | "register" | "watch_video";
  language: "Arabic" | "Kurdish" | "English";
  isABTesting: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  templateId: string; // "ab-test" or a specific template id
  templateIdsAB?: string[]; // list of template ids when A/B testing
  governorate: string; // "All" or specific
  category: string; // "All" or specific
  maxContacts: number;
  delaySeconds: number;
  status: "idle" | "running" | "paused" | "completed";
  totalSent: number;
  delivered: number;
  read: number;
  replied: number;
  interested: number;
  registered: number;
  createdAt: string;
}

export interface Contact {
  id: string;
  phone: string;
  businessName: string;
  governorate: string;
  category: string;
  source: string;
  lastMessageStatus: "sent" | "delivered" | "read" | "failed" | "none";
  lastReply?: string;
  lastReplyTime?: string;
  leadStage: LeadStage;
  assignedTemplateId?: string;
  notes?: string;
  updatedAt: string;
}

export interface ReplyInboxItem {
  id: string;
  phone: string;
  businessName: string;
  messageText: string;
  timestamp: string;
  campaignId?: string;
  campaignName?: string;
  isRead: boolean;
  notes?: string;
}

export interface WebhookEvent {
  id: string;
  eventId: string;
  eventType: "message.sent" | "message.ack" | "message.received" | "message.upsert";
  phone: string;
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed" | "received";
  timestamp: string;
  payload: any;
}

export interface CRMStats {
  totalContacts: number;
  totalSent: number;
  delivered: number;
  read: number;
  failed: number;
  replies: number;
  interestedLeads: number;
  registeredBusinesses: number;
  conversionRate: number; // custom KPI like registered / totalSent
}

export interface NabdaSettings {
  apiKey: string;
  sendEndpoint: string;
  webhookUrl: string;
  bundleApiKey: string;
  defaultDelay: number;
  maxMessagesPerBatch: number;
  enableRotation: boolean;
}
