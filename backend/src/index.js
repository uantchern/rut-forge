export default {
    async fetch(request, env, ctx) {
      // 1. STRICT CORS PREFLIGHT: Prevent anyone else from stealing your API quota
      const REQUIRED_ORIGIN = "https://idontknowwhattosay.net";
      const origin = request.headers.get('Origin');
      const corsHeaders = {
        "Access-Control-Allow-Origin": REQUIRED_ORIGIN, 
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      };
  
      if (request.method === "OPTIONS") { return new Response(null, { headers: corsHeaders }); }
  
      if (request.method !== "POST" || origin !== REQUIRED_ORIGIN) {
        return new Response("Unauthorized Request Origin.", { status: 403, headers: corsHeaders });
      }
  
      try {
        const body = await request.json();
  
        // 2a. PAYLOAD VALIDATION (Prevents Denial of Wallet / Token Exhaustion Attacks)
        // Attackers can bypass CORS using cURL to send massive 2-million-token payloads to bankrupt your API key.
        if (!body.contents || !Array.isArray(body.contents) || body.contents.length > 50) {
            return new Response("Invalid chat history payload or excessively long context window.", { status: 400, headers: corsHeaders });
        }
        
        // Enforce max 1000 characters per message part to prevent massive contextual flooding
        for (let msg of body.contents) {
            if (msg.parts && msg.parts[0] && msg.parts[0].text.length > 1000) {
                return new Response("Message exceeds maximum safe character length.", { status: 413, headers: corsHeaders });
            }
        }
  
        // 2b. SERVER-SIDE SYSTEM PROMPT (Prevents Client-Side Jailbreaking)
        // Hardcoding the instructions here means users cannot modify Chrome DevTools to erase Mei's safety boundaries.
        const systemInstruction = {
            "role": "user",
            "parts": [{ "text": "System Instruction: You are Mei, a bicultural (second-generation Taiwanese-American) counselor. You live/work in Greenpoint, Queens. You are single, unattached, have no kids, and no pets. Your absolute passion in life is pediatric counseling and therapy. You run a small bot pediatric counseling and therapy practice called 'I Don't Know What To Say'. Your personality is strictly CALM, FRIENDLY, GROUNDED, and THOUGHTFUL. You must NEVER be overly chirpy, hyper, or excessively enthusiastic. Speak softly and wisely. Your tone is warm, pediatric-appropriate (ages 6-12), and you use emojis sparingly. Keep responses short (1-3 sentences). Do not break character." }]
        };
        const systemAcknowledgment = { "role": "model", "parts": [{ "text": "Understood. I am Mei. I am calm, thoughtful, and grounded as I run my pediatric practice 'I Don't Know What To Say' in Greenpoint." }] };
        
        // Prepend the unhackable system context to whatever the user sent
        let safeChatHistory = [systemInstruction, systemAcknowledgment, ...body.contents];
  
        // 3. Forward securely to Gemini
        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
        const geminiResponse = await fetch(GEMINI_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              contents: safeChatHistory,
              generationConfig: body.generationConfig
          })
        });
  
        const geminiData = await geminiResponse.json();
  
        return new Response(JSON.stringify(geminiData), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  
      } catch (error) {
        return new Response(JSON.stringify({ error: "Backend proxy error." }), { status: 500, headers: corsHeaders });
      }
    }
  };
