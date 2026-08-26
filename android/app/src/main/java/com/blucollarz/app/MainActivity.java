package com.blucollarz.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeMediaPermissionsPlugin.class);
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
