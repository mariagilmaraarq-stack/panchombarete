// Supabase Edge Function: create-order
// Serves as a secure backend to recalculate prices and CMV from the database, never trusting client prices.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { productId, addonIds = [], customerName, pickupTime } = body;

    if (!productId) {
      return new Response(JSON.stringify({ error: "Produto obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customerName || customerName.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Nome do cliente obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Obter produto oficial do banco
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("active", true)
      .single();

    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "Produto inválido ou indisponível" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Obter adicionais oficiais do banco
    let addons = [];
    let addonsTotalGs = 0;
    let addonsCmvGs = 0;

    if (addonIds.length > 0) {
      const { data: dbAddons, error: addErr } = await supabase
        .from("add_ons")
        .select("*")
        .in("id", addonIds)
        .eq("active", true);

      if (!addErr && dbAddons) {
        addons = dbAddons;
        for (const a of addons) {
          addonsTotalGs += a.price_gs;
          addonsCmvGs += a.cmv_gs;
        }
      }
    }

    // 3. Recalcular preço oficial e CMV
    const subtotalGs = product.price_gs;
    const totalGs = subtotalGs + addonsTotalGs;
    const totalCmvGs = product.cmv_gs + addonsCmvGs;

    // 4. Gerar order_code no padrão PM-YYYYMMDD-HHMMSS-XXX
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    const rand = Math.floor(100 + Math.random() * 900);
    const orderCode = `PM-${year}${month}${day}-${hours}${minutes}${seconds}-${rand}`;

    // 5. Inserir pedido
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        order_code: orderCode,
        customer_name: customerName.trim(),
        pickup_time: pickupTime || "10–15 min",
        subtotal_gs: subtotalGs,
        addons_total_gs: addonsTotalGs,
        total_gs: totalGs,
        cmv_gs: totalCmvGs,
        status: "INICIADO",
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // 6. Inserir order_items
    await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      unit_price_gs: product.price_gs,
      cmv_gs: product.cmv_gs,
      quantity: 1,
    });

    // 7. Inserir order_addons
    if (addons.length > 0) {
      const addonRows = addons.map((a) => ({
        order_id: order.id,
        addon_id: a.id,
        addon_name: a.name,
        unit_price_gs: a.price_gs,
        cmv_gs: a.cmv_gs,
        quantity: 1,
      }));
      await supabase.from("order_addons").insert(addonRows);
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderCode,
        orderId: order.id,
        totalGs,
        productName: product.name,
        pickupTime: order.pickup_time,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
