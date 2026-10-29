import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.File;
import java.io.FileInputStream;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;

/**
 * Re-signs an APK (v1 + v2 + v3) with a PKCS12 keystore, verifies it and prints the signer
 * certificate SHA-256. Run through tools/sign-apk.sh. The password comes from the WD_KS_PASSWORD
 * environment variable so it never appears on a command line.
 *
 * Usage: java -cp apksig.jar SignApk.java in.apk out.apk keystore.p12 alias
 */
public class SignApk {
    public static void main(String[] a) throws Exception {
        if (a.length != 4) {
            System.err.println("usage: SignApk in.apk out.apk keystore.p12 alias");
            System.exit(2);
        }
        File in = new File(a[0]), out = new File(a[1]);
        char[] pw = System.getenv("WD_KS_PASSWORD").toCharArray();

        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (FileInputStream f = new FileInputStream(a[2])) { ks.load(f, pw); }
        PrivateKey key = (PrivateKey) ks.getKey(a[3], pw);
        if (key == null) throw new IllegalArgumentException("alias not found in keystore: " + a[3]);
        List<X509Certificate> chain = new ArrayList<>();
        for (java.security.cert.Certificate c : ks.getCertificateChain(a[3])) chain.add((X509Certificate) c);

        if (out.exists() && !out.delete()) throw new IllegalStateException("cannot overwrite " + out);
        ApkSigner.SignerConfig cfg = new ApkSigner.SignerConfig.Builder("wd", key, chain).build();
        new ApkSigner.Builder(List.of(cfg))
            .setInputApk(in)
            .setOutputApk(out)
            .setV1SigningEnabled(true)
            .setV2SigningEnabled(true)
            .setV3SigningEnabled(true)
            .setCreatedBy("Washing Daddy")
            .build()
            .sign();

        ApkVerifier.Result r = new ApkVerifier.Builder(out).build().verify();
        for (ApkVerifier.IssueWithParams e : r.getErrors()) System.err.println("ERROR: " + e);
        if (!r.isVerified()) { System.err.println("VERIFY FAILED"); System.exit(1); }
        System.out.println("verified: v1=" + r.isVerifiedUsingV1Scheme() + " v2=" + r.isVerifiedUsingV2Scheme()
            + " v3=" + r.isVerifiedUsingV3Scheme());
        for (X509Certificate c : r.getSignerCertificates()) {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(c.getEncoded());
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < d.length; i++) sb.append(i > 0 ? ":" : "").append(String.format("%02X", d[i]));
            System.out.println("signer SHA-256: " + sb);
        }
        System.out.println("alignment: " + alignmentReport(out));
    }

    /** Counts stored (uncompressed) entries whose data is not 4-byte aligned, like zipalign -c 4. */
    static String alignmentReport(File apk) throws Exception {
        try (RandomAccessFile f = new RandomAccessFile(apk, "r")) {
            long len = f.length();
            int tail = (int) Math.min(len, 65557);
            byte[] t = new byte[tail];
            f.seek(len - tail);
            f.readFully(t);
            int e = tail - 22;
            while (e >= 0 && !(t[e] == 0x50 && t[e + 1] == 0x4b && t[e + 2] == 5 && t[e + 3] == 6)) e--;
            ByteBuffer eocd = ByteBuffer.wrap(t, e, 22).order(ByteOrder.LITTLE_ENDIAN);
            int n = eocd.getShort(e + 10) & 0xffff;
            long cdOff = eocd.getInt(e + 16) & 0xffffffffL;
            f.seek(cdOff);
            byte[] cd = new byte[(int) (len - cdOff)];
            f.readFully(cd);
            ByteBuffer b = ByteBuffer.wrap(cd).order(ByteOrder.LITTLE_ENDIAN);
            int p = 0, stored = 0, bad = 0;
            for (int i = 0; i < n; i++) {
                int method = b.getShort(p + 10) & 0xffff;
                int nl = b.getShort(p + 28) & 0xffff, xl = b.getShort(p + 30) & 0xffff, cl = b.getShort(p + 32) & 0xffff;
                long lho = b.getInt(p + 42) & 0xffffffffL;
                if (method == 0) {
                    byte[] lh = new byte[30];
                    f.seek(lho);
                    f.readFully(lh);
                    ByteBuffer l = ByteBuffer.wrap(lh).order(ByteOrder.LITTLE_ENDIAN);
                    long data = lho + 30 + (l.getShort(26) & 0xffff) + (l.getShort(28) & 0xffff);
                    stored++;
                    if (data % 4 != 0) bad++;
                }
                p += 46 + nl + xl + cl;
            }
            return bad == 0 ? "ok (" + stored + " stored entries 4-byte aligned)" : "MISALIGNED " + bad + " of " + stored + " stored entries";
        }
    }
}
