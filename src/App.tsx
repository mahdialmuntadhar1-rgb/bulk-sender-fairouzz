import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import CampaignsView from "./components/CampaignsView";
import TemplatesView from "./components/TemplatesView";
import ContactsView from "./components/ContactsView";
import RepliesInboxView from "./components/RepliesInboxView";
import WebhookView from "./components/WebhookView";
import AnalyticsView from "./components/AnalyticsView";
import SettingsView from "./components/SettingsView";
import LeadsBoardView from "./components/LeadsBoardView";
import ConversationsView from "./components/ConversationsView";
import FollowUpsView from "./components/FollowUpsView";
import MediaManagerView from "./components/MediaManagerView";
import BundlesView from "./components/BundlesView";
import WhatsAppInstancesView from "./components/WhatsAppInstancesView";
import BillingSecurityView from "./components/BillingSecurityView";
import { apiGet, apiPost } from "./apiClient";

import { 
  LeadStage, 
  MessageTemplate, 
  Campaign, 
  Contact, 
  ReplyInboxItem, 
  WebhookEvent, 
  NabdaSettings 
} from "./types";

import { 
  INITIAL_TEMPLATES, 
  INITIAL_CAMPAIGNS, 
  INITIAL_CONTACTS, 
  INITIAL_INBOX, 
  INITIAL_WEBHOOK_EVENTS, 
  INITIAL_SETTINGS 
} from "./mockData";

export default function App() {
  // Navigation & Language Locales
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const [apiStatus, setApiStatus] = useState({
    loading: true,
    ok: false,
    message: "Checking Worker API and D1 database..."
  });

  useEffect(() => {
    let active = true;

    async function checkApiConnection() {
      try {
        const health = await apiGet("/api/health");
        const db = await apiGet("/api/db-test");

        if (!active) return;

        setApiStatus({
          loading: false,
          ok: Boolean(health.ok),
          message: `Worker + D1 connected. Tables found: ${db.tables?.length ?? 0}`
        });
      } catch (error: any) {
        if (!active) return;

        setApiStatus({
          loading: false,
          ok: false,
          message: `API connection failed: ${error?.message || "Unknown error"}`
        });
      }
    }

    checkApiConnection();

    return () => {
      active = false;
    };
  }, []);

  // Core CRM Datastores (Statefully Hydrated from standard localStorage for pristine persistence!)
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem("shakumaku_contacts");
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem("shakumaku_campaigns");
    return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
  });

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    const saved = localStorage.getItem("shakumaku_templates");
    return saved ? JSON.parse(saved) : INITIAL_TEMPLATES;
  });

  const [inbox, setInbox] = useState<ReplyInboxItem[]>(() => {
    const saved = localStorage.getItem("shakumaku_inbox");
    return saved ? JSON.parse(saved) : INITIAL_INBOX;
  });

  const [events, setEvents] = useState<WebhookEvent[]>(() => {
    const saved = localStorage.getItem("shakumaku_events");
    return saved ? JSON.parse(saved) : INITIAL_WEBHOOK_EVENTS;
  });

  const [settings, setSettings] = useState<NabdaSettings>(() => {
    const saved = localStorage.getItem("shakumaku_settings");
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // Save to LocalStorage whenever structures modify
  useEffect(() => {
    localStorage.setItem("shakumaku_contacts", JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem("shakumaku_campaigns", JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem("shakumaku_templates", JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem("shakumaku_inbox", JSON.stringify(inbox));
  }, [inbox]);

  useEffect(() => {
    localStorage.setItem("shakumaku_events", JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem("shakumaku_settings", JSON.stringify(settings));
  }, [settings]);

  // Read Inbox count to flash alerts
  const unreadInboxCount = inbox.filter(msg => !msg.isRead).length;

  // Colloquial Iraqi Repliers Text Helpers
  const generateIraqiReplyText = (name: string, category: string): string => {
    const cleaningName = name.split("(")[0].trim();
    switch (category) {
      case "Restaurant":
        return `Ã˜Â£Ã™â€¡Ã™â€žÃ˜Â§Ã™â€¹ Ã˜Â¹Ã™Å Ã™â€ Ã™Å  Ã˜Â´Ã™Æ’Ã˜Â±Ã˜Â§Ã™â€¹ Ã™â€žÃ™â€žÃ˜Â¯Ã˜Â¹Ã™Ë†Ã˜Â©.. Ã™â€¦Ã˜Â¹Ã™Æ’Ã™â€¦ Ã™Æ’Ã˜Â§Ã˜Â¯Ã˜Â± Ã™â€¦Ã˜Â·Ã˜Â¹Ã™â€¦ ${cleaningName}. Ã˜Â´Ã™â€žÃ™Ë†Ã™â€  Ã˜Â·Ã˜Â±Ã™Å Ã™â€šÃ˜Â© Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¬Ã˜Â§Ã™â€ Ã™Å  Ã™Ë†Ã˜Â³Ã˜Â±Ã˜Â¹Ã˜Â© Ã˜ÂªÃ™ÂÃ˜Â¹Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¯Ã™â€žÃ™Å Ã™â€žÃ˜Å¸`;
      case "Cafe":
        return `Ã™â€¦Ã˜Â±Ã˜Â­Ã˜Â¨Ã˜Â§Ã™â€¹Ã˜Å’ Ã™Ë†Ã˜ÂµÃ™â€žÃ˜ÂªÃ™â€ Ã˜Â§ Ã˜Â±Ã˜Â³Ã˜Â§Ã™â€žÃ˜Â© Ã˜Â´Ã˜Â§Ã™Æ’Ã™Ë† Ã™â€¦Ã˜Â§Ã™Æ’Ã™Ë†. Ã™â€ Ã˜Â±Ã™Å Ã˜Â¯ Ã™â€ Ã˜Â¶Ã™Å Ã™Â Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã™Å Ã™Ë† Ã™Ë†Ã˜Â§Ã™â€žÃ˜ÂµÃ™Ë†Ã˜Â± Ã™â€¦Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã˜Â§ Ã˜Â¨Ã™â€šÃ˜Â³Ã™â€¦ Ã˜Â¨Ã˜ÂºÃ˜Â¯Ã˜Â§Ã˜Â¯/Ã˜Â§Ã™â€žÃ˜Â¨Ã˜ÂµÃ˜Â±Ã˜Â©Ã˜Å’ Ã˜Â´Ã™â€žÃ™Ë†Ã™â€  Ã™â€ Ã˜Â³Ã™Ë†Ã™Å Ã˜Å¸`;
      case "Hotel":
        return `Ã˜Â³Ã™â€žÃ˜Â§Ã™Ë† Ã™Ë†Ã˜Â¨Ã˜Â®Ã™Å Ã˜Â± Ã™â€¡Ã˜Â§Ã˜ÂªÃ˜Â¨Ã™Å Ã™â€ .. Ã˜Â´Ã™Æ’Ã˜Â±Ã˜Â§Ã™â€¹ Ã™â€žÃ™Æ’Ã™â€¦. Ã™â€¡Ã™â€ž Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â¨Ã˜Â§Ã™â€šÃ˜Â© Ã˜Â§Ã˜Â´Ã˜ÂªÃ˜Â±Ã˜Â§Ã™Æ’ Ã˜Â³Ã™â€ Ã™Ë†Ã™Å Ã˜Â© Ã™â€¦Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â²Ã˜Â© Ã™â€žÃ™ÂÃ™â€ Ã˜Â¯Ã™â€š ${cleaningName} Ã™ÂÃ™Å  Ã™Æ’Ã˜Â±Ã˜Â¯Ã˜Â³Ã˜ÂªÃ˜Â§Ã™â€ Ã˜Å¸`;
      case "Beauty Salon":
        return `Ã™ÂÃ˜Â¯Ã™Ë†Ã˜Â© Ã˜Â¯Ã˜Â²Ã™Ë†Ã™â€žÃ™â€ Ã˜Â§ Ã˜ÂªÃ™ÂÃ˜Â§Ã˜ÂµÃ™Å Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â±Ã˜Â¶ Ã™Ë†Ã˜Â´Ã™â€žÃ™Ë†Ã™â€  Ã™â€ Ã™Ë†Ã˜Â«Ã™â€š Ã˜Â§Ã™â€žÃ™â€žÃ™Ë†Ã™Æ’Ã™Å Ã˜Â´Ã™â€  Ã™â€¦Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã˜Â§ Ã™Ë†Ã™â€ Ã˜Â¶Ã™Å Ã™Â Ã™â€¦Ã™Å Ã˜Â²Ã˜Â§Ã˜Âª Ã˜ÂµÃ˜Â§Ã™â€žÃ™Ë†Ã™â€  Ã˜Â§Ã™â€žÃ˜Â­Ã™â€žÃ˜Â§Ã™â€šÃ˜Â©Ã˜Å¸`;
      case "Pharmacy":
        return `Ã˜Â§Ã™â€žÃ˜Â³Ã™â€žÃ˜Â§Ã™â€¦ Ã˜Â¹Ã™â€žÃ™Å Ã™Æ’Ã™â€¦Ã˜Å’ Ã™â€¡Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â§Ã˜Â¯Ã˜Â±Ã˜Â§Ã˜Â¬ Ã™â€¦Ã˜Â¬Ã˜Â§Ã™â€ Ã™Å  Ã™â€žÃ™â€žÃ˜Â£Ã˜Â¨Ã˜Â¯ Ã™â€žÃ™Ë† Ã˜Â§Ã™Æ’Ã™Ë† Ã˜Â§Ã˜Â´Ã˜ÂªÃ˜Â±Ã˜Â§Ã™Æ’Ã˜Â§Ã˜Âª Ã™â€¦Ã˜Â®Ã™ÂÃ™Å Ã˜Â© Ã˜Â¨Ã˜Â¹Ã˜Â¯ Ã™ÂÃ˜ÂªÃ˜Â±Ã˜Â©Ã˜Å¸ Ã˜Â´Ã™Æ’Ã˜Â±Ã˜Â§Ã™â€¹ Ã™â€žÃ˜Â¬Ã™â€¡Ã™Ë†Ã˜Â¯Ã™Æ’Ã™â€¦.`;
      case "Clinic":
        return `Ã™â€¦Ã˜Â±Ã˜Â­Ã˜Â¨Ã˜Â§Ã™â€¹ Ã˜Â¨Ã™Æ’Ã˜Å’ Ã™â€ Ã˜Â­Ã™â€  Ã˜Â¹Ã™Å Ã˜Â§Ã˜Â¯Ã˜Â© Ã˜Â·Ã˜Â¨Ã™Å Ã˜Â© Ã™â€¦Ã˜ÂªÃ™Æ’Ã˜Â§Ã™â€¦Ã™â€žÃ˜Â©. Ã™â€ Ã™Ë†Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â­Ã˜ÂµÃ™Ë†Ã™â€ž Ã˜Â¹Ã™â€žÃ™â€° Ã˜ÂªÃ™ÂÃ˜Â§Ã˜ÂµÃ™Å Ã™â€ž Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ™Å Ã˜Â© Ã˜Â­Ã™Ë†Ã™â€ž Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â±Ã™Ë†Ã™Å Ã˜Â¬ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¨Ã˜Â§Ã˜Â´Ã˜Â±.`;
      default:
        return `Ã˜Â£Ã™â€¡Ã™â€žÃ˜Â§Ã™â€¹ Ã™Ë†Ã˜Â³Ã™â€¡Ã™â€žÃ˜Â§Ã™â€¹ Ã˜Â¹Ã™Å Ã™Ë†Ã™â€ Ã™Å Ã˜Å’ Ã™â€¦Ã™â€¡Ã˜ÂªÃ™â€¦Ã™Å Ã™â€  Ã˜Â¬Ã˜Â¯Ã˜Â§Ã™â€¹ Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â§Ã™â€ Ã˜Â¶Ã™â€¦Ã˜Â§Ã™â€¦ Ã™â€žÃ™â€žÃ˜Â¯Ã™â€žÃ™Å Ã™â€ž Ã™â€¦Ã˜Â¹ Ã™â€¦Ã™â€ Ã˜ÂµÃ˜ÂªÃ™Æ’Ã™â€¦ Ã˜Â´Ã˜Â§Ã™Æ’Ã™Ë† Ã™â€¦Ã˜Â§Ã™Æ’Ã™Ë†. Ã˜Â¨Ã˜Â§Ã™â€ Ã˜ÂªÃ˜Â¸Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ˜ÂªÃ™ÂÃ˜Â§Ã˜ÂµÃ™Å Ã™â€ž Ã˜Â®Ã˜Â·Ã™Ë†Ã˜Â© Ã˜Â¨Ã˜Â®Ã˜Â·Ã™Ë†Ã˜Â©.`;
    }
  };

  // Ã¢Å¡Â¡ Active Dispatch Interval Engine (Background Simulated Webhook Worker)
  useEffect(() => {
    // Find first campaign that is running
    const activeCamp = campaigns.find(c => c.status === "running");
    if (!activeCamp) return;

    // Set up timer based on campaign delay seconds
    const intervalId = setInterval(() => {
      // Re-fetch current state fields safely inside callback
      setCampaigns(prevCamps => {
        const targetCamp = prevCamps.find(c => c.id === activeCamp.id);
        if (!targetCamp || targetCamp.status !== "running") return prevCamps;

        // Fetch candidate contacts matching this segment
        const segmentContacts = contacts.filter(cont => {
          const matchGov = targetCamp.governorate === "All" || cont.governorate === targetCamp.governorate;
          const matchCat = targetCamp.category === "All" || cont.category === targetCamp.category;
          return matchGov && matchCat && cont.lastMessageStatus === "none";
        });

        // 1. If we reached max contacts target OR out of candidate leads:
        if (segmentContacts.length === 0 || targetCamp.totalSent >= targetCamp.maxContacts) {
          clearInterval(intervalId);
          return prevCamps.map(c => c.id === targetCamp.id ? { ...c, status: "completed" as const } : c);
        }

        // 2. Pick next target lead
        const targetLead = segmentContacts[0];
        
        // Arrange A/B split template selection
        let chosenTemplateId = targetCamp.templateId;
        if (targetCamp.templateId === "ab-test" && targetCamp.templateIdsAB && targetCamp.templateIdsAB.length > 0) {
          const randomIndex = Math.floor(Math.random() * targetCamp.templateIdsAB.length);
          chosenTemplateId = targetCamp.templateIdsAB[randomIndex];
        }

        const template = templates.find(t => t.id === chosenTemplateId) || templates[0];

        // 3. Mark contact, push immediate SENT, raise background sequential receipts
        setContacts(prevContacts => prevContacts.map(c => {
          if (c.id === targetLead.id) {
            return {
              ...c,
              lastMessageStatus: "sent",
              leadStage: LeadStage.SENT,
              assignedTemplateId: chosenTemplateId,
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        }));

        // Fire WABA Webhook: message.sent
        const messageId = `msg_nbd_sim_${Math.random().toString(36).substring(2, 10)}`;
        setEvents(prevEvents => [
          {
            id: `sim_ev_${Date.now()}`,
            eventId: `evt_nabda_${Math.floor(Math.random() * 900000) + 100000}`,
            eventType: "message.sent",
            phone: targetLead.phone,
            messageId,
            status: "sent",
            timestamp: new Date().toISOString(),
            payload: {
              instanceId: "inst_demo_waba",
              message: { id: messageId, to: targetLead.phone, body: template.text, type: "text" },
              status: "sent",
              timestamp: Date.now()
            }
          },
          ...prevEvents
        ]);

        // Sequential delay simulations: delivered (after 1.2s), read (after 2.5s), reply (after 4.5s)
        setTimeout(() => {
          // DELIVERED
          setContacts(p => p.map(c => c.id === targetLead.id ? { ...c, lastMessageStatus: "delivered", leadStage: LeadStage.DELIVERED } : c));
          setEvents(prevEvents => [
            {
              id: `sim_ev_del_${Date.now()}`,
              eventId: `evt_nabda_${Math.floor(Math.random() * 900000) + 100000}`,
              eventType: "message.ack",
              phone: targetLead.phone,
              messageId,
              status: "delivered",
              timestamp: new Date().toISOString(),
              payload: { instanceId: "inst_demo_waba", messageId, to: targetLead.phone, status: "delivered", ackType: "delivered_server" }
            },
            ...prevEvents
          ]);
          
          setCampaigns(c => c.map(cmp => cmp.id === targetCamp.id ? { ...cmp, delivered: cmp.delivered + 1 } : cmp));
        }, 1200);

        setTimeout(() => {
          // READ (90% chance)
          if (Math.random() < 0.9) {
            setContacts(p => p.map(c => c.id === targetLead.id ? { ...c, lastMessageStatus: "read", leadStage: LeadStage.READ } : c));
            setEvents(prevEvents => [
              {
                id: `sim_ev_read_${Date.now()}`,
                eventId: `evt_nabda_${Math.floor(Math.random() * 900000) + 100000}`,
                eventType: "message.ack",
                phone: targetLead.phone,
                messageId,
                status: "read",
                timestamp: new Date().toISOString(),
                payload: { instanceId: "inst_demo_waba", messageId, to: targetLead.phone, status: "read", ackType: "read_receipt" }
              },
              ...prevEvents
            ]);
            setCampaigns(c => c.map(cmp => cmp.id === targetCamp.id ? { ...cmp, read: cmp.read + 1 } : cmp));

            // CUSTOM INCOMING REPLY (50% chance of replying)
            setTimeout(() => {
              if (Math.random() < 0.5) {
                const replyText = generateIraqiReplyText(targetLead.businessName, targetLead.category);
                
                // Update stage to REPLIED and register the reply text
                setContacts(p => p.map(c => c.id === targetLead.id ? {
                  ...c, 
                  leadStage: LeadStage.REPLIED, 
                  lastReply: replyText,
                  lastReplyTime: new Date().toISOString()
                } : c));

                // Append inbox card
                setInbox(prevInbox => [
                  {
                    id: `sim_msg_${Date.now()}`,
                    phone: targetLead.phone,
                    businessName: targetLead.businessName,
                    messageText: replyText,
                    timestamp: new Date().toISOString(),
                    campaignId: targetCamp.id,
                    campaignName: targetCamp.name,
                    isRead: false
                  },
                  ...prevInbox
                ]);

                // Fire WhatsApp webhook
                setEvents(prevEvents => [
                  {
                    id: `sim_ev_rec_${Date.now()}`,
                    eventId: `evt_nabda_${Math.floor(Math.random() * 900000) + 100000}`,
                    eventType: "message.received",
                    phone: targetLead.phone,
                    messageId: `msg_client_${Math.random().toString(36).substring(2, 10)}`,
                    status: "received",
                    timestamp: new Date().toISOString(),
                    payload: {
                      instanceId: "inst_demo_waba",
                      message: { id: `msg_client_${Date.now()}`, from: targetLead.phone, body: replyText, type: "text" },
                      eventType: "message.received"
                    }
                  },
                  ...prevEvents
                ]);

                setCampaigns(c => c.map(cmp => cmp.id === targetCamp.id ? { ...cmp, replied: cmp.replied + 1 } : cmp));
              }
            }, 2500);

          }
        }, 3000);

        // Update total sent metric for running campaign
        return prevCamps.map(c => {
          if (c.id === targetCamp.id) {
            const nextSent = c.totalSent + 1;
            const isFinished = nextSent >= c.maxContacts;
            return {
              ...c,
              totalSent: nextSent,
              status: isFinished ? "completed" as const : c.status
            };
          }
          return c;
        });

      });
    }, activeCamp.delaySeconds * 1000);

    return () => clearInterval(intervalId);
  }, [campaigns, contacts, templates]);


  // Manual Single WhatsApp Dry-Run Send through Cloudflare Worker
  const handleSimulateSingleSend = async (contactId: string, templateId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    const template = templates.find(t => t.id === templateId) || templates[0];

    if (!contact || !template) return;

    try {
      const result = await apiPost("/api/send-one", {
        phone: contact.phone,
        message: template.text,
        businessName: contact.businessName,
        dryRun: true
      });

      setContacts(p => p.map(c => {
        if (c.id === contactId) {
          return {
            ...c,
            lastMessageStatus: "sent",
            leadStage: LeadStage.SENT,
            assignedTemplateId: templateId,
            notes: `${c.notes || ""}\n[Dry Run] Worker accepted test send. No real WhatsApp message was sent.`,
            updatedAt: new Date().toISOString()
          };
        }

        return c;
      }));

      const mId = `msg_worker_dry_${Date.now()}`;

      setEvents(p => [
        {
          id: `worker_dry_${Date.now()}`,
          eventId: `evt_worker_dry_${Math.floor(Math.random() * 900000) + 100000}`,
          eventType: "message.sent",
          phone: contact.phone,
          messageId: mId,
          status: "sent",
          timestamp: new Date().toISOString(),
          payload: {
            messageId: mId,
            to: contact.phone,
            text: template.text,
            api: "worker",
            dryRun: true,
            workerResponse: result
          }
        },
        ...p
      ]);

      alert("Dry-run saved to D1 logs. No real WhatsApp message was sent.");
    } catch (error: any) {
      setContacts(p => p.map(c => c.id === contactId ? {
        ...c,
        lastMessageStatus: "failed",
        notes: `${c.notes || ""}\n[Dry Run Failed] ${error?.message || "Unknown error"}`,
        updatedAt: new Date().toISOString()
      } : c));

      alert(`Dry-run failed: ${error?.message || "Unknown error"}`);
    }
  };

  // Leads Stage Manual override
  const handleUpdateLeadStage = (id: string, stage: LeadStage) => {
    setContacts(prev => prev.map(c => {
      if (c.id === id) {
        let repliesInc = 0;
        let regInc = 0;
        let intInc = 0;

        // If newly registered, update campaigns totals too which is awesome!
        if (stage === LeadStage.REGISTERED && c.leadStage !== LeadStage.REGISTERED) {
          regInc = 1;
        }

        return {
          ...c,
          leadStage: stage,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    }));
  };

  const handleUpdateLeadNotes = (id: string, notes: string) => {
    setContacts(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, notes, updatedAt: new Date().toISOString() };
      }
      return c;
    }));
  };

  // Ã¢Å¾â€¢ Create Contact Manual Onboarding
  const handleAddContact = (newContact: Omit<Contact, "id" | "updatedAt">) => {
    const contactRecord: Contact = {
      ...newContact,
      id: `contact_${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    setContacts(prev => [contactRecord, ...prev]);
  };


  // Ã¢Å¾â€¢ Create Campaign
  const handleCreateCampaign = (campData: Omit<Campaign, "id" | "totalSent" | "delivered" | "read" | "replied" | "interested" | "registered" | "createdAt" | "status">) => {
    const newCamp: Campaign = {
      ...campData,
      id: `camp_${Date.now()}`,
      status: "idle",
      totalSent: 0,
      delivered: 0,
      read: 0,
      replied: 0,
      interested: 0,
      registered: 0,
      createdAt: new Date().toISOString()
    };
    setCampaigns(prev => [newCamp, ...prev]);
  };

  const handleUpdateCampaignStatus = (id: string, status: Campaign["status"]) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };


  // Ã¢Å¾â€¢ Create template
  const handleCreateTemplate = (tempData: Omit<MessageTemplate, "id">) => {
    const newTemp: MessageTemplate = {
      ...tempData,
      id: `temp_${Date.now()}`
    };
    setTemplates(prev => [...prev, newTemp]);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };


  // Ã°Å¸â€œÂ¥ Micro action Inbox Macros
  const handleMarkInterested = (phone: string) => {
    setContacts(prev => prev.map(c => c.phone === phone ? { ...c, leadStage: LeadStage.INTERESTED, updatedAt: new Date().toISOString() } : c));
    setInbox(prev => prev.map(m => m.phone === phone ? { ...m, isRead: true } : m));
  };

  const handleSendRegLink = (phone: string) => {
    // Simulate API link send
    setContacts(prev => prev.map(c => c.phone === phone ? { 
      ...c, 
      leadStage: LeadStage.REGISTERED, // Simulates user checking & instantly registering!
      lastMessageStatus: "read",
      notes: (c.notes || "") + "\n[System Auto] Sent Shaku Maku registration link via Nabda. Merchant filled & registered!",
      updatedAt: new Date().toISOString() 
    } : c));
    
    setInbox(prev => prev.map(m => m.phone === phone ? { ...m, isRead: true, notes: "Sent Registration link. Converted successfully!" } : m));

    // Register webhook event
    setEvents(p => [
      {
        id: `reg_sim_${Date.now()}`,
        eventId: `evt_nabda_${Math.floor(Math.random() * 900000) + 100000}`,
        eventType: "message.sent",
        phone,
        messageId: `msg_reglink_${Date.now()}`,
        status: "sent",
        timestamp: new Date().toISOString(),
        payload: { text: "Ã˜Â¹Ã˜Â²Ã™Å Ã˜Â²Ã™Å Ã˜Å’ Ã™â€¡Ã˜Â°Ã˜Â§ Ã™â€¡Ã™Ë† Ã˜Â±Ã˜Â§Ã˜Â¨Ã˜Â· Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â³Ã˜Â¬Ã™Å Ã™â€ž Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â±Ã™Å  Ã™ÂÃ™Å  Ã™â€¦Ã™â€ Ã˜ÂµÃ˜Â© Ã˜Â´Ã˜Â§Ã™Æ’Ã™Ë† Ã™â€¦Ã˜Â§Ã™Æ’Ã™Ë†: https://shakumaku.iq/signup", type: "text_cta" }
      },
      ...p
    ]);
  };

  const handleSendTutorialVideo = (phone: string) => {
    setContacts(prev => prev.map(c => c.phone === phone ? { 
      ...c, 
      leadStage: LeadStage.FOLLOW_UP, 
      notes: (c.notes || "") + "\n[System Auto] Broadcasted 1-minute video pitch callback.",
      updatedAt: new Date().toISOString() 
    } : c));

    setInbox(prev => prev.map(m => m.phone === phone ? { ...m, isRead: true } : m));
  };

  const handleMarkNotInterested = (phone: string) => {
    setContacts(prev => prev.map(c => c.phone === phone ? { ...c, leadStage: LeadStage.NOT_INTERESTED, updatedAt: new Date().toISOString() } : c));
    setInbox(prev => prev.map(m => m.phone === phone ? { ...m, isRead: true } : m));
  };

  const handleAddNoteToReply = (phone: string, notes: string) => {
    setContacts(prev => prev.map(c => c.phone === phone ? { ...c, notes: (c.notes || "") + `\n${notes}`, updatedAt: new Date().toISOString() } : c));
    setInbox(prev => prev.map(m => m.phone === phone ? { ...m, notes, isRead: true } : m));
  };


  // Ã°Å¸â€™Â¬ Inject Simulated Random Incoming Message
  const handleTriggerSimulatedReply = (customText?: string) => {
    // Pick first contact that has received messages but hasn't replied yet, or fallback to standard
    const activeCandidates = contacts.filter(c => c.lastMessageStatus !== "none" && c.leadStage !== LeadStage.REGISTERED);
    const chosenContact = activeCandidates.length > 0 
      ? activeCandidates[Math.floor(Math.random() * activeCandidates.length)]
      : contacts[0];

    const messageText = customText || "Ã˜Â£Ã™â€¡Ã™â€žÃ˜Â§Ã™â€¹Ã˜Å’ Ã˜Â­Ã˜Â§Ã˜Â¨Ã™Å Ã™â€  Ã™â€ Ã˜Â´Ã˜ÂªÃ˜Â±Ã™Æ’ Ã™Ë†Ã™Å Ã˜Â§Ã™Æ’Ã™â€¦. Ã˜Â´Ã™â€žÃ™Ë†Ã™â€  Ã˜Â·Ã˜Â±Ã™Å Ã™â€šÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â¯Ã™ÂÃ˜Â¹ Ã™â€žÃ™Ë† Ã™â€¦Ã˜Â¬Ã˜Â§Ã™â€ Ã™Å Ã˜Å¸";
    
    setContacts(p => p.map(c => c.id === chosenContact.id ? { 
      ...c, 
      leadStage: LeadStage.REPLIED, 
      lastReply: messageText,
      lastReplyTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } : c));

    setInbox(prev => [
      {
        id: `sim_man_in_${Date.now()}`,
        phone: chosenContact.phone,
        businessName: chosenContact.businessName,
        messageText,
        timestamp: new Date().toISOString(),
        campaignName: "Test Simulation Manual",
        isRead: false
      },
      ...prev
    ]);

    // Add webhook log
    setEvents(p => [
      {
        id: `man_rec_sim_${Date.now()}`,
        eventId: `evt_nabda_${Math.floor(Math.random() * 900000) + 100000}`,
        eventType: "message.received",
        phone: chosenContact.phone,
        messageId: `msg_client_${Date.now()}`,
        status: "received",
        timestamp: new Date().toISOString(),
        payload: { instanceId: "inst_manual_tester", body: messageText, from: chosenContact.phone }
      },
      ...p
    ]);
  };


  // Render correct sub-dashboard view
  const renderViewContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <DashboardView 
            contacts={contacts} 
            campaigns={campaigns} 
            replies={inbox} 
            lang={lang}
            onNavigate={(section) => setActiveSection(section)}
          />
        );
      case "campaigns":
        return (
          <CampaignsView 
            campaigns={campaigns} 
            templates={templates} 
            onCreateCampaign={handleCreateCampaign}
            onUpdateStatus={handleUpdateCampaignStatus}
            lang={lang}
          />
        );
      case "templates":
        return (
          <TemplatesView 
            templates={templates} 
            contacts={contacts} 
            onCreateTemplate={handleCreateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            lang={lang}
          />
        );
      case "contacts":
        return (
          <ContactsView 
            contacts={contacts} 
            templates={templates}
            lang={lang}
            onUpdateLeadStage={handleUpdateLeadStage}
            onUpdateLeadNotes={handleUpdateLeadNotes}
            onAddContact={handleAddContact}
            onSimulateSingleSend={handleSimulateSingleSend}
          />
        );
      case "inbox":
        return (
          <RepliesInboxView 
            replies={inbox} 
            contacts={contacts} 
            lang={lang}
            onMarkInterested={handleMarkInterested}
            onSendRegLink={handleSendRegLink}
            onSendTutorialVideo={handleSendTutorialVideo}
            onMarkNotInterested={handleMarkNotInterested}
            onAddNote={handleAddNoteToReply}
            onTriggerSimulatedReply={handleTriggerSimulatedReply}
          />
        );
      case "webhooks":
        return (
          <WebhookView 
            events={events} 
            lang={lang}
            onClearLogs={() => setEvents([])}
          />
        );
      case "analytics":
        return (
          <AnalyticsView 
            contacts={contacts} 
            templates={templates} 
            lang={lang}
          />
        );
      case "settings":
        return (
          <SettingsView 
            settings={settings} 
            lang={lang}
            onSaveSettings={(newSettings) => setSettings(newSettings)}
          />
        );
      case "leads":
        return (
          <LeadsBoardView 
            contacts={contacts} 
            lang={lang} 
            onUpdateStage={handleUpdateLeadStage} 
          />
        );
      case "conversations":
        return (
          <ConversationsView 
            contacts={contacts} 
            templates={templates} 
            lang={lang} 
            onSendManualMessage={(contactId, text) => {
              setContacts(prev => prev.map(c => c.id === contactId ? {
                ...c,
                notes: (c.notes || "") + `\n[System Auto] Custom manual reply sent: ${text}`,
                updatedAt: new Date().toISOString()
              } : c));
            }}
            onSimulateSingleSend={(contactId, templateId) => {
              handleSimulateSingleSend(contactId, templateId);
            }}
          />
        );
      case "followups":
        return (
          <FollowUpsView 
            contacts={contacts} 
            lang={lang} 
            onSendRegLink={handleSendRegLink} 
            onSendTutorialVideo={handleSendTutorialVideo} 
            onUpdateStage={(id, stage) => {
              handleUpdateLeadStage(id, stage);
            }}
          />
        );
      case "media":
        return (
          <MediaManagerView 
            lang={lang} 
          />
        );
      case "bundles":
        return (
          <BundlesView 
            lang={lang} 
          />
        );
      case "instances":
        return (
          <WhatsAppInstancesView 
            lang={lang} 
          />
        );
      case "billing-security":
        return (
          <BillingSecurityView 
            lang={lang} 
          />
        );
      default:
        return <div>View is missing. Check routes.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0E] text-[#E2E8F0] font-sans flex flex-col md:flex-row relative">
      
      {/* Dynamic Right Side/Top menu (RTL/LTR reactive) */}
      <Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection} 
        lang={lang} 
        setLang={setLang}
        unreadInboxCount={unreadInboxCount}
      />

      {/* Main Console View Area */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto overflow-x-hidden min-h-screen pt-20 md:pt-8 w-full">
        {renderViewContent()}
      </main>
      
    </div>
  );
}

