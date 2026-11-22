package __PKG__;

import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import java.util.Arrays;

// 21/11 NFC: il telefono si fa leggere come un tag NFC Forum Type 4 che contiene il link in "payload"
public class BtHceService extends HostApduService {
    // Messaggio NDEF da servire (null = niente da condividere)
    public static volatile byte[] payload = null;

    private static final byte[] OK = new byte[] { (byte) 0x90, 0x00 };
    private static final byte[] NOT_FOUND = new byte[] { 0x6A, (byte) 0x82 };
    private static final byte[] BAD_INS = new byte[] { 0x6D, 0x00 };
    private static final byte[] AID = new byte[] {
        (byte) 0xD2, (byte) 0x76, 0x00, 0x00, (byte) 0x85, 0x01, 0x01
    };
    // CC: 15 byte, file NDEF E104, dimensione massima 0x01F4
    private static final byte[] CC = new byte[] {
        0x00, 0x0F, 0x20, 0x00, 0x3B, 0x00, 0x34, 0x04, 0x06,
        (byte) 0xE1, 0x04, 0x01, (byte) 0xF4, 0x00, (byte) 0xFF
    };

    private static final int FILE_NONE = 0;
    private static final int FILE_CC = 1;
    private static final int FILE_NDEF = 2;

    private int selected = FILE_NONE;

    @Override
    public byte[] processCommandApdu(byte[] cmd, Bundle extras) {
        try {
            if (cmd == null || cmd.length < 4) return BAD_INS;
            int ins = cmd[1] & 0xFF;
            if (ins == 0xA4) return handleSelect(cmd);
            if (ins == 0xB0) return handleRead(cmd);
            return BAD_INS;
        } catch (Throwable t) {
            return NOT_FOUND;
        }
    }

    @Override
    public void onDeactivated(int reason) {
        selected = FILE_NONE;
    }

    private byte[] handleSelect(byte[] cmd) {
        int p1 = cmd[2] & 0xFF;
        int lc = cmd.length > 4 ? (cmd[4] & 0xFF) : 0;
        if (cmd.length < 5 + lc) return NOT_FOUND;
        byte[] data = Arrays.copyOfRange(cmd, 5, 5 + lc);
        if (p1 == 0x04) {
            // SELECT per nome applicazione
            if (payload != null && Arrays.equals(data, AID)) {
                selected = FILE_NONE;
                return OK;
            }
            return NOT_FOUND;
        }
        if (p1 == 0x00 && data.length == 2) {
            if ((data[0] & 0xFF) == 0xE1 && data[1] == 0x03) {
                selected = FILE_CC;
                return OK;
            }
            if ((data[0] & 0xFF) == 0xE1 && data[1] == 0x04) {
                selected = FILE_NDEF;
                return OK;
            }
        }
        return NOT_FOUND;
    }

    private byte[] handleRead(byte[] cmd) {
        byte[] file;
        if (selected == FILE_CC) {
            file = CC;
        } else if (selected == FILE_NDEF) {
            byte[] p = payload;
            if (p == null) return NOT_FOUND;
            file = new byte[2 + p.length];
            file[0] = (byte) ((p.length >> 8) & 0xFF);
            file[1] = (byte) (p.length & 0xFF);
            System.arraycopy(p, 0, file, 2, p.length);
        } else {
            return NOT_FOUND;
        }
        int offset = ((cmd[2] & 0x7F) << 8) | (cmd[3] & 0xFF);
        int le = cmd.length > 4 ? (cmd[4] & 0xFF) : 0;
        if (le == 0) le = 256;
        if (offset > file.length) return NOT_FOUND;
        int n = Math.min(le, file.length - offset);
        byte[] resp = new byte[n + 2];
        System.arraycopy(file, offset, resp, 0, n);
        resp[n] = (byte) 0x90;
        resp[n + 1] = 0x00;
        return resp;
    }
}
