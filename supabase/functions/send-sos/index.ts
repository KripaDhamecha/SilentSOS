import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, GET, OPTIONS",
};


Deno.serve(async (req) => {

  /* =====================================================
     CORS
  ===================================================== */

  if (req.method === "OPTIONS") {

    return new Response(
      "ok",
      {
        headers: corsHeaders
      }
    );
  }


  /* =====================================================
     SERVER CONFIG
  ===================================================== */

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const serviceRoleKey =
    Deno.env.get("SERVICE_ROLE_KEY");

  const textBeeApiKey =
    Deno.env.get("TEXTBEE_API_KEY");

  const textBeeDeviceId =
    Deno.env.get("TEXTBEE_DEVICE_ID");


  if (!supabaseUrl || !serviceRoleKey) {

    return new Response(
      JSON.stringify({
        success: false,
        error: "Supabase server configuration is missing."
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
      }
    );
  }


  const supabaseAdmin =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );


  /* =====================================================
     SHORT AUDIO ACCESS

     SMS contains:

     https://.../send-sos?a=...

     instead of the long signed Supabase URL.
  ===================================================== */

  if (req.method === "GET") {

    try {

      const url =
        new URL(req.url);

      const encodedPath =
        url.searchParams.get("a");


      if (!encodedPath) {

        return new Response(
          "Audio link is invalid.",
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }


      let audioPath = "";

      try {

        audioPath =
          decodeURIComponent(
            atob(
              encodedPath
            )
          );

      } catch {

        return new Response(
          "Audio link is invalid.",
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }


      if (
        !audioPath ||
        !audioPath.includes("/")
      ) {

        return new Response(
          "Audio link is invalid.",
          {
            status: 400,
            headers: corsHeaders
          }
        );
      }


      const {
        data,
        error
      } =
        await supabaseAdmin
          .storage
          .from("sos-audio")
          .createSignedUrl(
            audioPath,
            60 * 60 * 24
          );


      if (error || !data?.signedUrl) {

        return new Response(
          "Audio recording is unavailable or has expired.",
          {
            status: 404,
            headers: corsHeaders
          }
        );
      }


      return Response.redirect(
        data.signedUrl,
        302
      );

    } catch (error) {

      console.error(
        "AUDIO ACCESS ERROR:",
        error
      );

      return new Response(
        "Unable to access audio.",
        {
          status: 500,
          headers: corsHeaders
        }
      );
    }
  }


  /* =====================================================
     SOS POST
  ===================================================== */

  if (req.method !== "POST") {

    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed."
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
      }
    );
  }


  try {

    /* ===================================================
       CHECK TEXTBEE CONFIG
    =================================================== */

    if (
      !textBeeApiKey ||
      !textBeeDeviceId
    ) {

      throw new Error(
        "TextBee configuration is missing."
      );
    }


    /* ===================================================
       AUTHENTICATION
    =================================================== */

    const authHeader =
      req.headers.get(
        "Authorization"
      );


    if (!authHeader) {

      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized."
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json"
          }
        }
      );
    }


    const token =
      authHeader.replace(
        "Bearer ",
        ""
      );


    const {
      data: {
        user
      },
      error: userError
    } =
      await supabaseAdmin.auth.getUser(
        token
      );


    if (
      userError ||
      !user
    ) {

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Invalid or expired login session."
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json"
          }
        }
      );
    }


    /* ===================================================
       REQUEST BODY
    =================================================== */

    const body =
      await req.json();


    const latitude =
      typeof body.latitude === "number"
        ? body.latitude
        : null;


    const longitude =
      typeof body.longitude === "number"
        ? body.longitude
        : null;


    const audioPath =
      typeof body.audio_path === "string" &&
      body.audio_path.trim() !== ""
        ? body.audio_path
        : null;


    /* ===================================================
       GET EMERGENCY CONTACTS FROM DATABASE

       We intentionally do not trust contacts supplied
       by the browser.
    =================================================== */

    const {
      data: contacts,
      error: contactsError
    } =
      await supabaseAdmin
        .from("emergency_contacts")
        .select(
          "id, name, phone"
        )
        .eq(
          "user_id",
          user.id
        );


    if (contactsError) {
      throw contactsError;
    }


    if (
      !contacts ||
      contacts.length === 0
    ) {

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No emergency contacts have been added."
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json"
          }
        }
      );
    }


    /* ===================================================
       CREATE ALERT RECORD
    =================================================== */

    const {
      data: alert,
      error: alertError
    } =
      await supabaseAdmin
        .from("sos_alerts")
        .insert({
          user_id: user.id,
          latitude,
          longitude,
          audio_path: audioPath,
          status: "processing"
        })
        .select()
        .single();


    if (alertError) {
      throw alertError;
    }


    /* ===================================================
       LOCATION
    =================================================== */

    let locationText =
      "Location unavailable";


    if (
      latitude !== null &&
      longitude !== null
    ) {

      locationText =
        `https://www.google.com/maps?q=${latitude},${longitude}`;
    }


    /* ===================================================
       CREATE SHORT AUDIO LINK
    =================================================== */

    let audioLink =
      "";


    if (audioPath) {

      const encodedAudioPath =
        btoa(
          encodeURIComponent(
            audioPath
          )
        );


      audioLink =
        `${supabaseUrl}/functions/v1/send-sos?a=${encodeURIComponent(encodedAudioPath)}`;
    }


    /* ===================================================
       SMS MESSAGE
    =================================================== */

    let message =
      "EMERGENCY ALERT\n\n" +
      "This person needs help immediately.\n\n" +
      "Live location:\n" +
      locationText;


    if (audioLink) {

      message +=
        "\n\n" +
        "Audio recording:\n" +
        "Click the link below to access the emergency audio:\n" +
        audioLink;
    }


    message +=
      "\n\n" +
      "Please respond immediately.";


    /* ===================================================
       RECIPIENTS
    =================================================== */

    const recipients =
      contacts
        .map(
          contact =>
            contact.phone
        )
        .filter(
          phone =>
            typeof phone === "string" &&
            phone.trim() !== ""
        );


    if (
      recipients.length === 0
    ) {

      throw new Error(
        "Emergency contacts do not contain valid phone numbers."
      );
    }


    /* ===================================================
       SEND THROUGH TEXTBEE
    =================================================== */

    const textBeeResponse =
      await fetch(
        "https://api.textbee.dev/api/v1/gateway/send-sms",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-api-key":
              textBeeApiKey
          },

          body: JSON.stringify({
            deviceId:
              textBeeDeviceId,

            recipients,

            message
          })
        }
      );


    const textBeeResponseText =
      await textBeeResponse.text();


    console.log(
      "TextBee status:",
      textBeeResponse.status
    );


    console.log(
      "TextBee response:",
      textBeeResponseText
    );


    /* ===================================================
       UPDATE ALERT STATUS
    =================================================== */

    const smsAccepted =
      textBeeResponse.ok;


    const finalStatus =
      smsAccepted
        ? "sms_accepted"
        : "sms_failed";


    await supabaseAdmin
      .from("sos_alerts")
      .update({
        status:
          finalStatus
      })
      .eq(
        "id",
        alert.id
      );


    /* ===================================================
       SMS LOG
    =================================================== */

    await supabaseAdmin
      .from("sms_logs")
      .insert({
        user_id:
          user.id,

        sos_alert_id:
          alert.id,

        recipient:
          recipients.join(", "),

        message,

        status:
          finalStatus
      });


    /* ===================================================
       RESPONSE
    =================================================== */

    return new Response(
      JSON.stringify({
        success:
          smsAccepted,

        status:
          finalStatus,

        audio_attached:
          Boolean(audioPath),

        audio_link_created:
          Boolean(audioLink)
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
      }
    );


  } catch (error) {

    console.error(
      "SEND SOS ERROR:",
      error
    );


    return new Response(
      JSON.stringify({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Something went wrong."
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json"
        }
      }
    );
  }

});