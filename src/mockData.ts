import { LeadStage, MessageTemplate, Campaign, Contact, ReplyInboxItem, WebhookEvent, NabdaSettings } from "./types";

export const GOVERNORATES = [
  "Baghdad",
  "Basra",
  "Erbil",
  "Sulaymaniyah",
  "Najaf",
  "Karbala",
  "Mosul",
  "Kirkuk",
  "Duhok",
  "Diyala"
];

export const GOVERNORATES_AR = {
  Baghdad: "بغداد",
  Basra: "البصرة",
  Erbil: "أربيل",
  Sulaymaniyah: "السليمانية",
  Najaf: "النجف",
  Karbala: "كربلاء",
  Mosul: "الموصل",
  Kirkuk: "كركوك",
  Duhok: "دهوك",
  Diyala: "ديالى"
};

export const CATEGORIES = [
  "Restaurant",
  "Cafe",
  "Pharmacy",
  "Clinic",
  "Hotel",
  "Beauty Salon",
  "Car Service",
  "Retail Shop"
];

export const CATEGORIES_AR = {
  Restaurant: "مطعم",
  Cafe: "مقهى",
  Pharmacy: "صيدلية",
  Clinic: "عيادة طبية",
  Hotel: "فندق",
  "Beauty Salon": "صالون تجميل",
  "Car Service": "خدمات سيارات",
  "Retail Shop": "محل تجزئة"
};

export const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    id: "temp-1",
    name: "Shaku Maku Basic Invitation (Arabic)",
    text: "مرحباً يا صاحب العمل الراقِي! تم اختيار مشروعكم للانضمام إلى منصة شاكو ماكو، أكبر دليل تجاري موثق في العراق لزيادة مبيعاتكم مجاناً. هل ترغب بالتسجيل؟ أرسل 1 الآن وسنتواصل معك.",
    ctaType: "reply_1",
    language: "Arabic",
    isABTesting: false
  },
  {
    id: "temp-2",
    name: "Promo Link Offer (Arabic)",
    text: "أهلاً بك! زبائن أكثر بانتظاركم في بغداد والمحافظات. سجل مشروعك التجاري الآن في شاكو ماكو واحصل على باقة الترويج الذهبية مجاناً لمدة 30 يوماً. للتسجيل الفوري اضغط:",
    ctaType: "visit_link",
    language: "Arabic",
    isABTesting: false
  },
  {
    id: "temp-3",
    name: "Erbil/Suli Kurdish Invitation",
    text: "سلاو هاوڕێی بەڕێز! دەتەوێت کار متمانەپێکراوەکەت فراوانتر بکەیت لە کوردستان؟ لە ڕێگەی شاكۆ ماكۆ دەتوانیت بگەی بە هەزاران کڕیاری نوێ لە عێراق. بۆ تۆمارکردن پەیوەندیمان پێوە بکە بە ناردنی 1.",
    ctaType: "reply_1",
    language: "Kurdish",
    isABTesting: false
  },
  {
    id: "temp-4",
    name: "Video Overview Pitch (English)",
    text: "Hello! Expand your business reach across Iraq with Shaku Maku. Check out our 1-minute tutorial video to see how quick registration will double your local search impressions: https://shakumaku.iq/video/intro",
    ctaType: "watch_video",
    language: "English",
    isABTesting: false
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "camp-1",
    name: "Baghdad Elite Restaurants Launch",
    templateId: "temp-1",
    governorate: "Baghdad",
    category: "Restaurant",
    maxContacts: 10,
    delaySeconds: 5,
    status: "completed",
    totalSent: 10,
    delivered: 9,
    read: 7,
    replied: 4,
    interested: 2,
    registered: 1,
    createdAt: "2026-06-01T10:00:00Z"
  },
  {
    id: "camp-2",
    name: "Erbil Hotel and Tourism Drive",
    templateId: "temp-3",
    governorate: "Erbil",
    category: "Hotel",
    maxContacts: 5,
    delaySeconds: 6,
    status: "paused",
    totalSent: 4,
    delivered: 4,
    read: 3,
    replied: 2,
    interested: 1,
    registered: 1,
    createdAt: "2026-06-03T11:30:00Z"
  },
  {
    id: "camp-3",
    name: "Basra Cafes A/B Test Campaign",
    templateId: "ab-test",
    templateIdsAB: ["temp-1", "temp-2"],
    governorate: "Basra",
    category: "Cafe",
    maxContacts: 8,
    delaySeconds: 4,
    status: "running",
    totalSent: 6,
    delivered: 5,
    read: 4,
    replied: 3,
    interested: 2,
    registered: 1,
    createdAt: "2026-06-05T09:00:00Z"
  }
];

export const INITIAL_CONTACTS: Contact[] = [
  // Baghdad Restaurants
  {
    id: "contact-1",
    phone: "+9647701234567",
    businessName: "Al-Samad Fish Restaurant (مسكوف الصمد)",
    governorate: "Baghdad",
    category: "Restaurant",
    source: "Google Maps",
    lastMessageStatus: "read",
    lastReply: "نعم أريد التسجيل، كيف أبدأ؟",
    lastReplyTime: "2026-06-01T15:24:00Z",
    leadStage: LeadStage.INTERESTED,
    assignedTemplateId: "temp-1",
    notes: "يتكلم بالنيابة عنه الأستاذ علي المدير المسؤول.",
    updatedAt: "2026-06-01T15:30:00Z"
  },
  {
    id: "contact-2",
    phone: "+9647809876543",
    businessName: "Saj Al-Reef (صاج الريف)",
    governorate: "Baghdad",
    category: "Restaurant",
    source: "Instagram Directory",
    lastMessageStatus: "read",
    lastReply: "تم التسجيل والحمد لله شكراً لكم",
    lastReplyTime: "2026-06-02T09:12:00Z",
    leadStage: LeadStage.REGISTERED,
    assignedTemplateId: "temp-1",
    notes: "سعيد جداً بالسهولة والسرعة.",
    updatedAt: "2026-06-02T09:15:00Z"
  },
  {
    id: "contact-3",
    phone: "+9647501112233",
    businessName: "Zarzour Mansour (مطعم زرزور المنصور)",
    governorate: "Baghdad",
    category: "Restaurant",
    source: "Walk-in Lead",
    lastMessageStatus: "delivered",
    leadStage: LeadStage.DELIVERED,
    assignedTemplateId: "temp-1",
    notes: "تم الإرسال خلال وجبة العشاء.",
    updatedAt: "2026-06-01T19:00:00Z"
  },
  {
    id: "contact-4",
    phone: "+9647712223344",
    businessName: "Burger Joint Karrada (برجر الكرادة)",
    governorate: "Baghdad",
    category: "Restaurant",
    source: "Facebook Page",
    lastMessageStatus: "failed",
    leadStage: LeadStage.BAD_NUMBER,
    assignedTemplateId: "temp-1",
    notes: "الرقم لا يملك واتساب مفعّل.",
    updatedAt: "2026-06-01T11:45:00Z"
  },

  // Basra Cafes
  {
    id: "contact-5",
    phone: "+9647721112222",
    businessName: "Shatt Al-Arab Cafe (قهوة شط العرب)",
    governorate: "Basra",
    category: "Cafe",
    source: "Manual Scouting",
    lastMessageStatus: "read",
    lastReply: "شنو الفائدة من الاشتراك؟",
    lastReplyTime: "2026-06-05T12:04:00Z",
    leadStage: LeadStage.REPLIED,
    assignedTemplateId: "temp-2",
    notes: "يحتاج توضيح الباقة الذهبية المجانية والميزات.",
    updatedAt: "2026-06-05T12:10:00Z"
  },
  {
    id: "contact-6",
    phone: "+9647814445555",
    businessName: "Basra Times Square Cafe",
    governorate: "Basra",
    category: "Cafe",
    source: "Instagram Directory",
    lastMessageStatus: "read",
    lastReply: "سجلت بالموقع وشكراً",
    lastReplyTime: "2026-06-05T14:15:00Z",
    leadStage: LeadStage.REGISTERED,
    assignedTemplateId: "temp-1",
    notes: "سلك مسار A/B ورأى التمبلت الأساسي وسجل فوراً.",
    updatedAt: "2026-06-05T14:30:00Z"
  },
  {
    id: "contact-7",
    phone: "+9647517778888",
    businessName: "Al-Eshari Traditional Cafe",
    governorate: "Basra",
    category: "Cafe",
    source: "Yellow Pages",
    lastMessageStatus: "sent",
    leadStage: LeadStage.SENT,
    assignedTemplateId: "temp-2",
    notes: "أرسل له العرض الترويجي برابط التسجيل.",
    updatedAt: "2026-06-05T09:12:00Z"
  },

  // Erbil Hotels
  {
    id: "contact-8",
    phone: "+9647509990001",
    businessName: "Erbil Rotana Hotel",
    governorate: "Erbil",
    category: "Hotel",
    source: "Booking.com Hub",
    lastMessageStatus: "read",
    lastReply: "Supas, we will register today",
    lastReplyTime: "2026-06-03T14:50:00Z",
    leadStage: LeadStage.INTERESTED,
    assignedTemplateId: "temp-3",
    notes: "ردوا باللغة الكردية والإنجليزية.",
    updatedAt: "2026-06-03T15:00:00Z"
  },
  {
    id: "contact-9",
    phone: "+9647504443322",
    businessName: "Davin Hotel Erbil",
    governorate: "Erbil",
    category: "Hotel",
    source: "Google Places",
    lastMessageStatus: "read",
    lastReply: "سپاس بۆ ئێوە",
    lastReplyTime: "2026-06-03T16:20:00Z",
    leadStage: LeadStage.REGISTERED,
    assignedTemplateId: "temp-3",
    notes: "تمت متابعتهم يدوياً حتى تم التسجيل بنجاح.",
    updatedAt: "2026-06-04T10:00:00Z"
  },

  // Najaf Clinics
  {
    id: "contact-10",
    phone: "+9647823334444",
    businessName: "Ibn Al-Haytham Eye Clinic",
    governorate: "Najaf",
    category: "Clinic",
    source: "Medical Guide Iraq",
    lastMessageStatus: "none",
    leadStage: LeadStage.NEW,
    notes: "مستهدف لحملة عيادات الفرات الأوسط القادمة.",
    updatedAt: "2026-06-05T18:00:00Z"
  },
  {
    id: "contact-11",
    phone: "+9647819998888",
    businessName: "Al-Amal Pharmacy (صيدلية الأمل)",
    governorate: "Najaf",
    category: "Pharmacy",
    source: "Scouted list",
    lastMessageStatus: "read",
    lastReply: "غير مهتمين حالياً شكراً",
    lastReplyTime: "2026-06-02T13:40:00Z",
    leadStage: LeadStage.NOT_INTERESTED,
    assignedTemplateId: "temp-2",
    notes: "مكتفي بالإعلانات المحلية الورقية والدعاية بالشارع.",
    updatedAt: "2026-06-02T14:00:00Z"
  },
  {
    id: "contact-12",
    phone: "+9647709991111",
    businessName: "Glow & Care Beauty (صالون جلاو)",
    governorate: "Sulaymaniyah",
    category: "Beauty Salon",
    source: "Instagram Scraper",
    lastMessageStatus: "none",
    leadStage: LeadStage.NEW,
    notes: "رقم تليفون الصالون الرئيسي.",
    updatedAt: "2026-06-06T01:00:00Z"
  },
  {
    id: "contact-13",
    phone: "+9647833334444",
    businessName: "Babel Babylon Auto Center",
    governorate: "Baghdad",
    category: "Car Service",
    source: "Facebook Directory",
    lastMessageStatus: "read",
    lastReply: "دزولنا تفاصيل أكثر بفيديو لو أمكن",
    lastReplyTime: "2026-06-05T19:15:00Z",
    leadStage: LeadStage.FOLLOW_UP,
    assignedTemplateId: "temp-4",
    notes: "يريد فيديو تعريفي، تم إرسال رابط اليوتيوب لمشاهدته وفي انتظار الرد.",
    updatedAt: "2026-06-05T19:30:00Z"
  }
];

export const INITIAL_INBOX: ReplyInboxItem[] = [
  {
    id: "msg-1",
    phone: "+9647701234567",
    businessName: "Al-Samad Fish Restaurant (مسكوف الصمد)",
    messageText: "نعم أريد التسجيل، كيف أبدأ؟ وهل يحتاج رخصة تجارية أو عقد إيجار المحل؟",
    timestamp: "2026-06-01T15:24:00Z",
    campaignId: "camp-1",
    campaignName: "Baghdad Elite Restaurants Launch",
    isRead: false
  },
  {
    id: "msg-2",
    phone: "+9647721112222",
    businessName: "Shatt Al-Arab Cafe (قهوة شط العرب)",
    messageText: "شنو الفائدة من الاشتراك؟ اكو اشتراكات شهرية بعدين لو مجاني للأبد؟",
    timestamp: "2026-06-05T12:04:00Z",
    campaignId: "camp-3",
    campaignName: "Basra Cafes A/B Test Campaign",
    isRead: false
  },
  {
    id: "msg-3",
    phone: "+9647509990001",
    businessName: "Erbil Rotana Hotel",
    messageText: "Supas, we will register today. Our marketing director Mr. Aram will fill the form.",
    timestamp: "2026-06-03T14:50:00Z",
    campaignId: "camp-2",
    campaignName: "Erbil Hotel and Tourism Drive",
    isRead: true
  },
  {
    id: "msg-4",
    phone: "+9647833334444",
    businessName: "Babel Babylon Auto Center",
    messageText: "دزولنا تفاصيل أكثر بفيديو لو أمكن، الرابط الفوك ما اشتغل عندي.",
    timestamp: "2026-06-05T19:15:00Z",
    campaignId: "camp-1",
    campaignName: "Baghdad Elite Restaurants Launch",
    isRead: false
  }
];

export const INITIAL_WEBHOOK_EVENTS: WebhookEvent[] = [
  {
    id: "ev-1",
    eventId: "evt_nabda_928410293",
    eventType: "message.sent",
    phone: "+9647701234567",
    messageId: "msg_nbd_f829a1b2",
    status: "sent",
    timestamp: "2026-06-01T10:01:05Z",
    payload: {
      instanceId: "inst_66281",
      message: {
        id: "msg_nbd_f829a1b2",
        to: "+9647701234567",
        body: "مرحباً يا صاحب العمل الراقِي! تم اختيار مشروعكم للانضمام إلى منصة شاكو ماكو...",
        type: "text"
      },
      status: "sent",
      timestamp: 1780311665
    }
  },
  {
    id: "ev-2",
    eventId: "evt_nabda_928410294",
    eventType: "message.ack",
    phone: "+9647701234567",
    messageId: "msg_nbd_f829a1b2",
    status: "delivered",
    timestamp: "2026-06-01T10:01:12Z",
    payload: {
      instanceId: "inst_66281",
      messageId: "msg_nbd_f829a1b2",
      to: "+9647701234567",
      status: "delivered",
      ackType: "delivered_server",
      timestamp: 1780311672
    }
  },
  {
    id: "ev-3",
    eventId: "evt_nabda_928410295",
    eventType: "message.ack",
    phone: "+9647701234567",
    messageId: "msg_nbd_f829a1b2",
    status: "read",
    timestamp: "2026-06-01T10:03:45Z",
    payload: {
      instanceId: "inst_66281",
      messageId: "msg_nbd_f829a1b2",
      to: "+9647701234567",
      status: "read",
      ackType: "read_receipt",
      timestamp: 1780311825
    }
  },
  {
    id: "ev-4",
    eventId: "evt_nabda_928410300",
    eventType: "message.received",
    phone: "+9647701234567",
    messageId: "msg_client_abc9921",
    status: "received",
    timestamp: "2026-06-01T15:24:00Z",
    payload: {
      instanceId: "inst_66281",
      message: {
        id: "msg_client_abc9921",
        from: "+9647701234567",
        body: "نعم أريد التسجيل، كيف أبدأ؟ وهل يحتاج رخصة تجارية أو عقد إيجار المحل؟",
        type: "text",
        timestamp: 1780331040
      },
      eventType: "message.received"
    }
  }
];

export const INITIAL_SETTINGS: NabdaSettings = {
  apiKey: "nbd_live_7a3d2eef98c94e0193bbcc102431ff9d03",
  sendEndpoint: "https://api.nabda.com/api/v1/messages/send",
  webhookUrl: "https://shakumaku.iq/api/v1/webhooks/nabda-whatsapp",
  bundleApiKey: "nbd_bndl_9921eef00a2948ce761",
  defaultDelay: 5,
  maxMessagesPerBatch: 250,
  enableRotation: true
};
