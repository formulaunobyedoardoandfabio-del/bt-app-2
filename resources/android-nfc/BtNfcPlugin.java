package __PKG__;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.cardemulation.CardEmulation;
import android.nfc.tech.IsoDep;
import android.nfc.tech.Ndef;
import android.os.Bundle;
import android.os.Parcelable;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

// 21/11 NFC: lettura di tag/telefoni (reader mode) e condivisione di un link (emulazione di tag, vedi BtHceService)
@CapacitorPlugin(name = "BtNfc")
public class BtNfcPlugin extends Plugin {
    private static final byte[] AID = new byte[] {
        (byte) 0xD2, (byte) 0x76, 0x00, 0x00, (byte) 0x85, 0x01, 0x01
    };

    private boolean reading = false;
    private String pending = null;
    // Link che il telefono sta prestando all'NFC: servito solo con l'app davanti (in pausa si toglie, poi torna)
    private volatile byte[] sharing = null;

    private final NfcAdapter.ReaderCallback readerCallback = new NfcAdapter.ReaderCallback() {
        @Override
        public void onTagDiscovered(Tag tag) {
            try {
                NdefMessage msg = readNdef(tag);
                String url = urlFromMessage(msg);
                if (url == null) {
                    notifyError("Nessun link nel tag");
                    return;
                }
                JSObject o = new JSObject();
                o.put("url", url);
                notifyListeners("nfcUrl", o);
            } catch (Throwable t) {
                notifyError(t.getMessage() == null ? "Lettura NFC non riuscita" : t.getMessage());
            }
        }
    };

    @Override
    public void load() {
        // App aperta toccando un tag mentre era chiusa
        try {
            Activity a = getActivity();
            if (a != null) handleIntent(a.getIntent());
        } catch (Throwable ignored) {
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        try {
            handleIntent(intent);
        } catch (Throwable ignored) {
        }
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        // Il reader mode va spento quando l'app va in secondo piano (reading resta true); il link prestato
        // all'NFC non resta leggibile col telefono in tasca
        disableReader();
        BtHceService.payload = null;
        prefer(false);
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (reading) enableReader();
        if (sharing != null) {
            BtHceService.payload = sharing;
            prefer(true);
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        try {
            NfcAdapter adapter = NfcAdapter.getDefaultAdapter(getContext());
            boolean hce = getContext().getPackageManager()
                .hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION);
            JSObject o = new JSObject();
            o.put("supported", adapter != null);
            o.put("enabled", adapter != null && adapter.isEnabled());
            o.put("hce", hce);
            call.resolve(o);
        } catch (Throwable t) {
            JSObject o = new JSObject();
            o.put("supported", false);
            o.put("enabled", false);
            o.put("hce", false);
            call.resolve(o);
        }
    }

    @PluginMethod
    public void startRead(PluginCall call) {
        try {
            NfcAdapter adapter = NfcAdapter.getDefaultAdapter(getContext());
            if (adapter == null) {
                call.reject("NFC non disponibile su questo telefono");
                return;
            }
            reading = true;
            enableReader();
            call.resolve();
        } catch (Throwable t) {
            call.reject("Impossibile avviare la lettura NFC");
        }
    }

    @PluginMethod
    public void stopRead(PluginCall call) {
        try {
            reading = false;
            disableReader();
        } catch (Throwable ignored) {
        }
        call.resolve();
    }

    @PluginMethod
    public void share(PluginCall call) {
        try {
            String url = call.getString("url");
            if (url == null || url.length() == 0) {
                call.reject("Link mancante");
                return;
            }
            NdefMessage msg = new NdefMessage(new NdefRecord[] { NdefRecord.createUri(url) });
            byte[] bytes = msg.toByteArray();
            if (bytes.length > 498) {
                call.reject("Link troppo lungo");
                return;
            }
            sharing = bytes;
            BtHceService.payload = sharing;
            prefer(true);
            JSObject o = new JSObject();
            o.put("ok", true);
            call.resolve(o);
        } catch (Throwable t) {
            call.reject("Impossibile condividere il link");
        }
    }

    @PluginMethod
    public void stopShare(PluginCall call) {
        sharing = null;
        BtHceService.payload = null;
        prefer(false);
        call.resolve();
    }

    @PluginMethod
    public void takePending(PluginCall call) {
        JSObject o = new JSObject();
        try {
            o.put("url", pending);
        } catch (Throwable ignored) {
        }
        pending = null;
        call.resolve(o);
    }

    // ── interni ──

    private void enableReader() {
        try {
            Activity a = getActivity();
            NfcAdapter adapter = NfcAdapter.getDefaultAdapter(getContext());
            if (a == null || adapter == null) return;
            Bundle extras = new Bundle();
            extras.putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, 250);
            int flags = NfcAdapter.FLAG_READER_NFC_A | NfcAdapter.FLAG_READER_NFC_B
                | NfcAdapter.FLAG_READER_NFC_F | NfcAdapter.FLAG_READER_NFC_V;
            adapter.enableReaderMode(a, readerCallback, flags, extras);
        } catch (Throwable ignored) {
        }
    }

    private void disableReader() {
        try {
            Activity a = getActivity();
            NfcAdapter adapter = NfcAdapter.getDefaultAdapter(getContext());
            if (a == null || adapter == null) return;
            adapter.disableReaderMode(a);
        } catch (Throwable ignored) {
        }
    }

    // Il nostro servizio NFC passa davanti ad altre app che usano lo stesso AID (niente scelta dell'app al tocco)
    private void prefer(final boolean on) {
        final Activity a = getActivity();
        if (a == null) return;
        a.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    NfcAdapter adapter = NfcAdapter.getDefaultAdapter(a);
                    if (adapter == null) return;
                    CardEmulation ce = CardEmulation.getInstance(adapter);
                    if (on) ce.setPreferredService(a, new ComponentName(a, BtHceService.class));
                    else ce.unsetPreferredService(a);
                } catch (Throwable ignored) {
                }
            }
        });
    }

    private void notifyError(String message) {
        try {
            JSObject o = new JSObject();
            o.put("message", message);
            notifyListeners("nfcError", o);
        } catch (Throwable ignored) {
        }
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        if (!NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction())) return;
        if ((intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) return;
        Parcelable[] raw = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
        if (raw == null) return;
        for (Parcelable p : raw) {
            if (!(p instanceof NdefMessage)) continue;
            String url = urlFromMessage((NdefMessage) p);
            if (url != null) {
                if (!hasListeners("nfcUrl")) pending = url;
                JSObject o = new JSObject();
                o.put("url", url);
                notifyListeners("nfcUrl", o, true);
                return;
            }
        }
    }

    // Primo record URI o testo del messaggio
    private static String urlFromMessage(NdefMessage msg) {
        if (msg == null) return null;
        NdefRecord[] records = msg.getRecords();
        if (records == null) return null;
        for (NdefRecord r : records) {
            try {
                android.net.Uri u = r.toUri();
                if (u != null) return u.toString();
            } catch (Throwable ignored) {
            }
        }
        for (NdefRecord r : records) {
            try {
                if (r.getTnf() == NdefRecord.TNF_WELL_KNOWN
                    && Arrays.equals(r.getType(), NdefRecord.RTD_TEXT)) {
                    byte[] p = r.getPayload();
                    if (p == null || p.length < 1) continue;
                    int status = p[0] & 0xFF;
                    int langLen = status & 0x3F;
                    if (1 + langLen > p.length) continue;
                    Charset cs = (status & 0x80) != 0 ? StandardCharsets.UTF_16 : StandardCharsets.UTF_8;
                    String text = new String(p, 1 + langLen, p.length - 1 - langLen, cs).trim();
                    if (text.length() > 0) return text;
                }
            } catch (Throwable ignored) {
            }
        }
        return null;
    }

    private static NdefMessage readNdef(Tag tag) throws Exception {
        Ndef ndef = Ndef.get(tag);
        if (ndef != null) {
            try {
                NdefMessage cached = ndef.getCachedNdefMessage();
                if (cached != null) return cached;
                ndef.connect();
                return ndef.getNdefMessage();
            } finally {
                try {
                    ndef.close();
                } catch (Throwable ignored) {
                }
            }
        }
        IsoDep iso = IsoDep.get(tag);
        if (iso != null) return readType4(iso);
        return null;
    }

    // Lettura a mano di un tag NFC Forum Type 4 (anche un altro telefono che emula il tag)
    private static NdefMessage readType4(IsoDep iso) throws Exception {
        try {
            iso.connect();
            iso.setTimeout(3000);
            // SELECT applicazione NDEF
            byte[] sel = new byte[5 + AID.length + 1];
            sel[0] = 0x00;
            sel[1] = (byte) 0xA4;
            sel[2] = 0x04;
            sel[3] = 0x00;
            sel[4] = (byte) AID.length;
            System.arraycopy(AID, 0, sel, 5, AID.length);
            sel[sel.length - 1] = 0x00;
            check(iso.transceive(sel));
            // SELECT file CC
            check(iso.transceive(new byte[] { 0x00, (byte) 0xA4, 0x00, 0x0C, 0x02, (byte) 0xE1, 0x03 }));
            // READ BINARY 15 byte del CC
            byte[] cc = check(iso.transceive(new byte[] { 0x00, (byte) 0xB0, 0x00, 0x00, 0x0F }));
            if (cc.length < 11) throw new Exception("CC non valido");
            // SELECT file NDEF (id ai byte 9-10 del CC)
            check(iso.transceive(new byte[] { 0x00, (byte) 0xA4, 0x00, 0x0C, 0x02, cc[9], cc[10] }));
            // NLEN (2 byte)
            byte[] nl = check(iso.transceive(new byte[] { 0x00, (byte) 0xB0, 0x00, 0x00, 0x02 }));
            if (nl.length < 2) throw new Exception("NLEN non valido");
            int nlen = ((nl[0] & 0xFF) << 8) | (nl[1] & 0xFF);
            if (nlen <= 0 || nlen > 8192) throw new Exception("Messaggio NDEF vuoto o troppo grande");
            int mle = ((cc[3] & 0xFF) << 8) | (cc[4] & 0xFF);
            int chunk = Math.min(0xF0, mle > 0 ? mle : 0xF0);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            int done = 0;
            while (done < nlen) {
                int n = Math.min(chunk, nlen - done);
                int off = 2 + done;
                byte[] part = check(iso.transceive(new byte[] {
                    0x00, (byte) 0xB0, (byte) ((off >> 8) & 0x7F), (byte) (off & 0xFF), (byte) n
                }));
                if (part.length == 0) throw new Exception("Lettura interrotta");
                out.write(part, 0, part.length);
                done += part.length;
            }
            return new NdefMessage(out.toByteArray());
        } finally {
            try {
                iso.close();
            } catch (Throwable ignored) {
            }
        }
    }

    // Controlla che la risposta finisca con 90 00 e restituisce i dati senza i due byte di stato
    private static byte[] check(byte[] resp) throws Exception {
        if (resp == null || resp.length < 2
            || resp[resp.length - 2] != (byte) 0x90 || resp[resp.length - 1] != 0x00) {
            throw new Exception("Risposta NFC non valida");
        }
        return Arrays.copyOf(resp, resp.length - 2);
    }
}
