import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAdmin } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive list of known disposable email domains (150+ domains)
const DISPOSABLE_DOMAINS = [
  // Popular disposable email services
  'guerrillamail.com', 'mailinator.com', 'tempmail.com', '10minutemail.com',
  'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc',
  'yopmail.com', 'fake-mail.com', 'sharklasers.com', 'guerrillamail.net',
  'trashmail.com', 'mailnesia.com', 'mintemail.com', 'mytrashmail.com',
  
  // Additional disposable domains
  'dispostable.com', 'emailondeck.com', 'spamgourmet.com', 'jetable.org',
  'disposableemailaddresses.com', 'trash-mail.com', 'guerrillamailblock.com',
  'spambox.us', 'incognitomail.com', 'anonymbox.com', 'mailcatch.com',
  'throwawaymail.com', 'hide.biz.st', 'mytempemail.com', 'spamfree24.org',
  'tempemail.net', 'tempinbox.com', 'fakeinbox.com', 'burnermail.io',
  'getairmail.com', 'guerrillamail.biz', 'guerrillamail.de', 'spam4.me',
  'grr.la', 'guerrillamail.org', 'pokemail.net', 'spamcon.org',
  'speed.1s.fr', 'mail-temporaire.fr', 'meltmail.com', 'trashmailer.com',
  'filzmail.com', 'armyspy.com', 'cuvox.de', 'dayrep.com', 'einrot.com',
  'fleckens.hu', 'gustr.com', 'jourrapide.com', 'rhyta.com', 'superrito.com',
  'teleworm.us', 'spambog.com', 'spambog.de', 'spambog.ru', 'tafmail.com',
  'doanart.com', 'dropmail.me', 'emltmp.com', 'mailtemp.net', 'tmails.net',
  'mohmal.com', 'mowgli.jungleheart.com', 'nospam.ze.tc', 'recipeforfailure.com',
  'sharklasers.com', 'spam.la', 'spaml.de', 'tempr.email', 'trash2009.com',
  'wegwerfmail.de', 'wegwerfemail.de', 'zehnminuten.de', 'mail.tm',
  'inboxbear.com', 'slipry.net', 'trbvm.com', 'gufum.com', 'laste.ml',
  'mail.wtf', 'muatra.com', 'owlpic.com', 'ruffrey.com', 'tafoi.gr',
  'tmpmail.net', 'tmpeml.info', '20minutemail.com', '33mail.com',
  'anonbox.net', 'binkmail.com', 'bobmail.info', 'clrmail.com',
  'deadaddress.com', 'despam.it', 'disposemail.com', 'dodgeit.com',
  'e4ward.com', 'emailias.com', 'emailmiser.com', 'emailto.de',
  'emailwarden.com', 'enterto.com', 'ephemail.net', 'fastacura.com',
  'fastchevy.com', 'fastchrysler.com', 'fastkawasaki.com', 'fastmazda.com',
  'fastnissan.com', 'fastsubaru.com', 'fastsuzuki.com', 'fasttoyota.com',
  'fastyamaha.com', 'getonemail.com', 'gishpuppy.com', 'greensloth.com',
  'harakirimail.com', 'hatespam.org', 'ihateyoualot.info', 'imstations.com',
  'inboxclean.com', 'incognitomail.org', 'insorg-mail.info', 'ipoo.org',
  'irish2me.com', 'jetable.com', 'jetable.fr.nf', 'jetable.net',
  'kasmail.com', 'koszmail.pl', 'lags.us', 'linksnappy.com',
  'litedrop.com', 'lookugly.com', 'lortemail.dk', 'lr78.com',
  'maileater.com', 'mailexpire.com', 'mailfreeonline.com', 'mailin8r.com',
  'mailinator2.com', 'mailme.lv', 'mailmetrash.com', 'mailmoat.com',
  'mailnull.com', 'mailshell.com', 'mailsiphon.com', 'mailslite.com',
  'meltmail.com', 'mierdamail.com', 'mintemail.com', 'mt2009.com'
];

interface VerificationRequest {
  domain: string;
}

interface VerificationResult {
  isValid: boolean;
  isDisposable: boolean;
  mxRecordsValid: boolean;
  reason?: string;
  mxRecords?: string[];
}

async function checkMXRecords(domain: string): Promise<{ valid: boolean; records: string[] }> {
  try {
    // Use DNS-over-HTTPS to check MX records
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`,
      {
        headers: {
          'accept': 'application/dns-json',
        },
      }
    );

    if (!response.ok) {
      console.error(`DNS lookup failed for ${domain}:`, response.statusText);
      return { valid: false, records: [] };
    }

    const data = await response.json();
    
    if (!data.Answer || data.Answer.length === 0) {
      console.log(`No MX records found for ${domain}`);
      return { valid: false, records: [] };
    }

    const mxRecords = (data.Answer as Array<{ type: number; data: string }>)
      .filter((record) => record.type === 15) // MX records have type 15
      .map((record) => record.data)
      .filter(Boolean);

    console.log(`MX records for ${domain}:`, mxRecords);
    
    return {
      valid: mxRecords.length > 0,
      records: mxRecords
    };
  } catch (error) {
    console.error(`Error checking MX records for ${domain}:`, error);
    return { valid: false, records: [] };
  }
}

function isDisposableEmail(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  return DISPOSABLE_DOMAINS.some(disposable => 
    lowerDomain === disposable || lowerDomain.endsWith('.' + disposable)
  );
}

async function verifyEmailDomain(domain: string): Promise<VerificationResult> {
  console.log(`Verifying domain: ${domain}`);
  
  // Check if disposable email
  if (isDisposableEmail(domain)) {
    console.log(`Domain ${domain} is a disposable email service`);
    return {
      isValid: false,
      isDisposable: true,
      mxRecordsValid: false,
      reason: 'Disposable email service not allowed'
    };
  }

  // Check MX records
  const mxCheck = await checkMXRecords(domain);
  
  if (!mxCheck.valid) {
    console.log(`Domain ${domain} has no valid MX records`);
    return {
      isValid: false,
      isDisposable: false,
      mxRecordsValid: false,
      reason: 'No valid MX records found for domain',
      mxRecords: []
    };
  }

  console.log(`Domain ${domain} verified successfully`);
  return {
    isValid: true,
    isDisposable: false,
    mxRecordsValid: true,
    mxRecords: mxCheck.records
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access using shared middleware
    const { supabase: supabaseClient } = await requireAdmin(req);

    const { domain }: VerificationRequest = await req.json();

    if (!domain) {
      throw new Error('Domain is required');
    }

    // Verify the domain
    const result = await verifyEmailDomain(domain);

    // Update the database with verification results
    const { error: updateError } = await supabaseClient
      .from('allowed_email_domains')
      .update({
        verification_status: result.isValid ? 'verified' : 'failed',
        mx_records_valid: result.mxRecordsValid,
        last_verified_at: new Date().toISOString()
      })
      .eq('domain', domain);

    if (updateError) {
      console.error('Error updating domain verification status:', updateError);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('Error in verify-email-domain function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error?.message === 'Unauthorized' || error?.message?.includes('Unauthorized') ? 401 : 500,
      }
    );
  }
});
