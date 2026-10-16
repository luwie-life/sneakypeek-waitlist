export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const { email, consent, website } = req.body || {};

    // Block automated spam submissions.
    if (website) {
      return res.status(200).json({ success: true });
    }

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (consent !== true) {
      return res.status(400).json({
        error: "Please agree to receive launch updates."
      });
    }

    const apiKey = process.env.BREVO_API_KEY;
    const listId = Number(process.env.BREVO_LIST_ID || "3");

    if (!apiKey || !Number.isInteger(listId) || listId < 1) {
      console.error("Brevo environment variables are missing or invalid.");
      return res.status(500).json({
        error: "The waitlist is temporarily unavailable. Please try again later."
      });
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        listIds: [listId],
        updateEnabled: true,
        attributes: {
          CREATOR_TYPE: "Not specified"
        }
      })
    });

    if (!brevoResponse.ok) {
      const details = await brevoResponse.text();
      console.error("Brevo request failed:", brevoResponse.status, details);

      return res.status(502).json({
        error: "We couldn't add you just yet. Please try again."
      });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Waitlist signup error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
