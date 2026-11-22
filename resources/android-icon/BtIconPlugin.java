package __PKG__;

import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;

// 22/11 Icona dell'app: ogni icona è un activity-alias "<package>.BtIcon_<id>" di MainActivity (scripts/prepare_android.py);
// se ne tiene acceso uno solo. set({ id, now: true }) cambia subito (alcuni telefoni chiudono l'app un momento);
// now: false la cambia quando l'app va in secondo piano (icona della scuderia che cambia, icona dell'8 agosto).
@CapacitorPlugin(name = "BtIcon")
public class BtIconPlugin extends Plugin {
    private static final String PREFIX = ".BtIcon_";
    private static final String PREFS = "bt_icon";
    private String pending = null;

    @Override
    public void load() {
        try {
            pending = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("pending", null);
        } catch (Throwable ignored) {
        }
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        if (pending != null) {
            String id = pending;
            pending = null;
            savePending(null);
            try {
                apply(id);
            } catch (Throwable ignored) {
            }
        }
    }

    @PluginMethod
    public void available(PluginCall call) {
        try {
            JSObject o = new JSObject();
            JSArray ids = new JSArray();
            for (String id : aliasIds()) ids.put(id);
            o.put("ids", ids);
            o.put("current", currentId());
            o.put("pending", pending);
            call.resolve(o);
        } catch (Throwable t) {
            call.reject("Icone non disponibili");
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String id = call.getString("id");
        boolean now = Boolean.TRUE.equals(call.getBoolean("now", false));
        try {
            if (id == null || !aliasIds().contains(id)) {
                call.reject("Icona non disponibile");
                return;
            }
            if (id.equals(currentId())) {
                pending = null;
                savePending(null);
            } else if (now) {
                pending = null;
                savePending(null);
                apply(id);
            } else {
                pending = id;
                savePending(id);
            }
            JSObject o = new JSObject();
            o.put("ok", true);
            call.resolve(o);
        } catch (Throwable t) {
            call.reject("Impossibile cambiare l'icona");
        }
    }

    // ── interni ──

    private void savePending(String id) {
        try {
            SharedPreferences.Editor e = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
            if (id == null) e.remove("pending");
            else e.putString("pending", id);
            e.apply();
        } catch (Throwable ignored) {
        }
    }

    private List<ActivityInfo> aliases() throws Exception {
        PackageManager pm = getContext().getPackageManager();
        PackageInfo info = pm.getPackageInfo(getContext().getPackageName(),
            PackageManager.GET_ACTIVITIES | PackageManager.MATCH_DISABLED_COMPONENTS);
        List<ActivityInfo> out = new ArrayList<>();
        if (info.activities == null) return out;
        for (ActivityInfo a : info.activities) {
            if (a.name != null && a.name.contains(PREFIX) && a.targetActivity != null) out.add(a);
        }
        return out;
    }

    private List<String> aliasIds() throws Exception {
        List<String> out = new ArrayList<>();
        for (ActivityInfo a : aliases()) out.add(a.name.substring(a.name.indexOf(PREFIX) + PREFIX.length()));
        return out;
    }

    private boolean isOn(PackageManager pm, ActivityInfo a) {
        int s = pm.getComponentEnabledSetting(new ComponentName(getContext().getPackageName(), a.name));
        if (s == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) return true;
        if (s == PackageManager.COMPONENT_ENABLED_STATE_DEFAULT) return a.enabled;
        return false;
    }

    private String currentId() throws Exception {
        PackageManager pm = getContext().getPackageManager();
        for (ActivityInfo a : aliases()) {
            if (isOn(pm, a)) return a.name.substring(a.name.indexOf(PREFIX) + PREFIX.length());
        }
        return null;
    }

    // Prima si accende la nuova, poi si spengono le altre: così l'app ha sempre un'icona.
    private void apply(String id) throws Exception {
        PackageManager pm = getContext().getPackageManager();
        String pkg = getContext().getPackageName();
        List<ActivityInfo> all = aliases();
        ActivityInfo target = null;
        for (ActivityInfo a : all) if (a.name.endsWith(PREFIX + id)) target = a;
        if (target == null) return;
        pm.setComponentEnabledSetting(new ComponentName(pkg, target.name),
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
        for (ActivityInfo a : all) {
            if (a == target) continue;
            pm.setComponentEnabledSetting(new ComponentName(pkg, a.name),
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
        }
    }
}
