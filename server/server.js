const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

exports = {
  events: [
    { event: "onScheduledEvent", callback: "detectSpamTickets" },
    { event: "onAppInstall", callback: "onAppInstall" }
  ],

  // Triggered when app is installed
  onAppInstall: async function () {
    try {
      await $schedule.create({
        name: `spam_detection_${Date.now()}`,
        data: {},
        schedule_at: new Date(Date.now() + 1 * 60 * 1000).toISOString(),
        repeat: {
          time_unit: "minutes",
          frequency: 10
        }
      });
      console.log(" Spam detection schedule created successfully.");
      renderData()
    } catch (error) {
      console.error(" Failed to create schedule:", error);
      renderData()
    }
  },

  // Scheduled event handler
  detectSpamTickets: async function (args) {
    try {
      console.log(" Fetching all tickets...");
      const ticketRes = await $request.invokeTemplate("get_all_tickets", {});
      const tickets = JSON.parse(ticketRes.response);
      console.log(` Fetched ${tickets.length} tickets.`);

      for (const ticket of tickets) {
        console.log(` Analyzing Ticket ID ${ticket.id} | Subject: ${ticket.subject}`);

        const prompt = `You are a strict spam classification assistant for customer support tickets.

There are 4 possible labels:
1. "spam"
2. "it may be spam"
3. "not_spam"
4. "subject_not_related_to_description"

Instructions:
- Think step-by-step.
- Then respond ONLY with a JSON object using this format:
{ "label": "<one of the four options above>" }

### Ticket:
Subject: ${ticket.subject}
Description: ${ticket.description}`;

        const groqRes = await this.makeGroqCall(prompt, args.iparams);
        if (!groqRes) {
          console.log(` Groq API call failed for Ticket ID ${ticket.id}. Skipping...`);
          continue;
        }

        const raw = groqRes?.choices?.[0]?.message?.content?.replace(/```json|```/g, '').trim();
        console.log(` Groq response for Ticket ID ${ticket.id}:`, raw);

        let label = "";
        try {
          label = JSON.parse(raw).label.toLowerCase();
        } catch (err) {
          console.log(` Failed to parse Groq response for Ticket ID ${ticket.id}`);
          continue;
        }

        if (label === "spam") {
          try {
            await $request.invokeTemplate("update_ticket_tag", {
              context: { ticket_id: ticket.id },
              body: JSON.stringify({ tags: ["spam"] })
            });
            console.log(` Ticket ID ${ticket.id} tagged as 'spam'`);
          } catch (err) {
            console.error(` Failed to tag Ticket ID ${ticket.id} as spam`, err);
          }
        } else if (label === "not_spam") {
          try {
            await $request.invokeTemplate("update_ticket_tag", {
              context: { ticket_id: ticket.id },
              body: JSON.stringify({ tags: ["not_spam"] })
            });
            console.log(` Ticket ID ${ticket.id} tagged as 'not_spam'`);
          } catch (err) {
            console.error(` Failed to tag Ticket ID ${ticket.id} as not_spam`, err);
          }
        } else {
          console.log(` Ticket ID ${ticket.id}: Ignored label '${label}'`);
        }
      }
    } catch (err) {
      console.error(" Error in detectSpamTickets:", err);
    }
  },

  // Groq API call
  makeGroqCall: async function (prompt, iparams) {
    try {
      const apiKey = iparams.groq_api_key;
      const response = await $request.invokeTemplate("groq_classify", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gemma2-9b-it",
          messages: [
            { role: "system", content: "You are a spam detection assistant." },
            { role: "user", content: prompt }
          ]
        })
      });
      console.log("Groq API call successful.");
      return JSON.parse(response.response);
    } catch (error) {
      console.error("Groq API call failed:", error);
      return null;
    }
  }
};
