// Public settings only. Server-side flags and keys independently gate real sales.
export const storeConfig=Object.freeze({
 enabled:true,
 environment:'prod',
 orderUrl:'https://btakiyexojkrrfwoxbtk.supabase.co/functions/v1/create-order-live',
 statusUrl:'https://btakiyexojkrrfwoxbtk.supabase.co/functions/v1/payment-status',
 publicKey:'sb_publishable_AYzNYouauDeN4YixLaPwug_igEvPDCz',
 turnstileSiteKey:'0x4AAAAAAFxffxSjIcPl3Jxa',
 consentVersion:'2026-11-03'
});
