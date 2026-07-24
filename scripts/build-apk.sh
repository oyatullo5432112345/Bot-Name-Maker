#!/usr/bin/env bash
# Talim Platform APK yasash skripti
# Ishlatish: bash scripts/build-apk.sh
set -e

DOMAIN="${REPLIT_DEV_DOMAIN:-$(grep REPLIT_DOMAINS .replit | head -1 | sed 's/.*= *"\(.*\)"/\1/')}"
APK_OUT="/tmp/talim-platform.apk"
TWA_DIR="/tmp/talim-twa"
SDK_DIR="/tmp/android-sdk"

echo "🔨 APK yasash boshlandi..."
echo "📡 Domain: $DOMAIN"

# JDK tekshirish
if ! java -version 2>/dev/null; then
  echo "❌ JDK topilmadi. 'jdk17' nix paketini o'rnating."
  exit 1
fi

# Android SDK yuklab olish
if [ ! -d "$SDK_DIR/platforms/android-33" ]; then
  echo "📥 Android SDK yuklab olinmoqda..."
  mkdir -p "$SDK_DIR"
  curl -sL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" \
    -o /tmp/cmdline-tools.zip
  unzip -q /tmp/cmdline-tools.zip -d "$SDK_DIR/cmdline-tools/"
  mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
  yes | "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" \
    "platforms;android-33" "build-tools;33.0.2" \
    --sdk_root="$SDK_DIR" 2>&1 | grep -E "Downloading|Installing"
fi

# TWA project yaratish
rm -rf "$TWA_DIR" && mkdir -p "$TWA_DIR"

# Manifest
cat > "$TWA_DIR/settings.gradle" << 'EOF'
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = "TalimPlatform"
include ':app'
EOF

cat > "$TWA_DIR/build.gradle" << 'EOF'
plugins { id 'com.android.application' version '8.1.4' apply false }
EOF

cat > "$TWA_DIR/gradle.properties" << 'EOF'
android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m
EOF

mkdir -p "$TWA_DIR/app/src/main/res/values" \
         "$TWA_DIR/app/src/main/res/drawable" \
         "$TWA_DIR/app/src/main/res/drawable-nodpi"

# Splash screen generatsiya
echo "🎨 Splash screen yaratilmoqda..."
node scripts/generate-splash.mjs /tmp/talim-splash.png
cp /tmp/talim-splash.png "$TWA_DIR/app/src/main/res/drawable-nodpi/splash_bg.png"

cat > "$TWA_DIR/app/src/main/res/values/strings.xml" << EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="app_name">Talim Platform</string>
  <string name="app_url">https://$DOMAIN</string>
  <string name="app_host">$DOMAIN</string>
</resources>
EOF

cat > "$TWA_DIR/app/src/main/res/values/colors.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources><color name="colorPrimary">#0f1729</color></resources>
EOF

cat > "$TWA_DIR/app/src/main/res/values/styles.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="Theme.TalimSplash" parent="@android:style/Theme.NoTitleBar">
    <item name="android:windowBackground">@drawable/splash</item>
    <item name="android:windowFullscreen">true</item>
    <item name="android:windowContentOverlay">@null</item>
  </style>
</resources>
EOF

cat > "$TWA_DIR/app/src/main/res/drawable/splash.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item>
    <bitmap
      android:src="@drawable/splash_bg"
      android:gravity="fill"/>
  </item>
</layer-list>
EOF

cat > "$TWA_DIR/app/src/main/AndroidManifest.xml" << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.INTERNET" />
  <application android:label="@string/app_name" android:icon="@mipmap/ic_launcher"
    android:theme="@style/Theme.TalimSplash" android:allowBackup="true">
    <activity android:name="com.google.androidbrowserhelper.trusted.LauncherActivity" android:exported="true">
      <meta-data android:name="android.support.customtabs.trusted.DEFAULT_URL" android:value="@string/app_url" />
      <meta-data android:name="android.support.customtabs.trusted.STATUS_BAR_COLOR" android:resource="@color/colorPrimary" />
      <meta-data android:name="android.support.customtabs.trusted.SPLASH_IMAGE_DRAWABLE" android:resource="@drawable/splash" />
      <meta-data android:name="android.support.customtabs.trusted.SPLASH_SCREEN_BACKGROUND_COLOR" android:resource="@color/colorPrimary" />
      <intent-filter><action android:name="android.intent.action.MAIN" /><category android:name="android.intent.category.LAUNCHER" /></intent-filter>
      <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT" /><category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="https" android:host="@string/app_host" />
      </intent-filter>
    </activity>
    <service android:name="com.google.androidbrowserhelper.trusted.DelegationService" android:exported="true" android:enabled="true">
      <intent-filter><action android:name="android.support.customtabs.trusted.TRUSTED_WEB_ACTIVITY_SERVICE"/><category android:name="android.intent.category.DEFAULT"/></intent-filter>
    </service>
  </application>
</manifest>
EOF

cat > "$TWA_DIR/app/build.gradle" << 'EOF'
plugins { id 'com.android.application' }
android {
  namespace 'com.toshloq.talim'; compileSdk 33
  defaultConfig { applicationId "com.toshloq.talim"; minSdk 21; targetSdk 33; versionCode 1; versionName "1.0" }
  buildTypes { debug { debuggable true } }
  compileOptions { sourceCompatibility JavaVersion.VERSION_1_8; targetCompatibility JavaVersion.VERSION_1_8 }
}
dependencies { implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0' }
EOF

cat > "$TWA_DIR/local.properties" << EOF
sdk.dir=$SDK_DIR
EOF

mkdir -p "$TWA_DIR/gradle/wrapper"
curl -sL "https://github.com/gradle/gradle/raw/v8.5.0/gradle/wrapper/gradle-wrapper.jar" \
  -o "$TWA_DIR/gradle/wrapper/gradle-wrapper.jar"
cat > "$TWA_DIR/gradle/wrapper/gradle-wrapper.properties" << 'EOF'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

cat > "$TWA_DIR/gradlew" << 'EOF'
#!/usr/bin/env sh
APP_HOME="$(cd "$(dirname "$0")" && pwd)"
exec java -cp "$APP_HOME/gradle/wrapper/gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain "$@"
EOF
chmod +x "$TWA_DIR/gradlew"

# Ikonkalar
for size_dir in "48:mipmap-mdpi" "72:mipmap-hdpi" "96:mipmap-xhdpi" "144:mipmap-xxhdpi" "192:mipmap-xxxhdpi"; do
  size="${size_dir%%:*}"; dir="${size_dir##*:}"
  mkdir -p "$TWA_DIR/app/src/main/res/$dir"
  node -e "
    const sharp = require('./node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js');
    sharp('./artifacts/platform/public/logo.png')
      .resize($size,$size,{fit:'contain',background:'#0f1729'})
      .toFile('$TWA_DIR/app/src/main/res/$dir/ic_launcher.png')
      .then(()=>console.log('$dir ok')).catch(console.error);
  "
done

# Build
echo "🔨 Gradle build..."
export ANDROID_SDK_ROOT="$SDK_DIR"
export GRADLE_USER_HOME=/tmp/gradle-home
cd "$TWA_DIR" && ./gradlew assembleDebug --no-daemon -q

# APK nusxalash
find "$TWA_DIR" -name "*.apk" -exec cp {} "$APK_OUT" \;
echo "✅ APK tayyor: $APK_OUT ($(du -sh $APK_OUT | cut -f1))"

# Telegram'ga yuborish va file_id saqlash
BOT_TOKEN="$TELEGRAM_BOT_TOKEN"
ADMIN_ID_VAL="$ADMIN_ID"
if [ -n "$BOT_TOKEN" ] && [ -n "$ADMIN_ID_VAL" ]; then
  echo "📤 Telegram'ga yuklanmoqda..."
  RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendDocument" \
    -F "chat_id=${ADMIN_ID_VAL}" \
    -F "document=@${APK_OUT};filename=talim-platform.apk" \
    -F "caption=📲 Talim Platform APK — yangilandi!")
  FILE_ID=$(echo "$RESPONSE" | node -e "
    const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if(d.ok) process.stdout.write(d.result.document.file_id);
    else process.stderr.write(JSON.stringify(d));
  ")
  if [ -n "$FILE_ID" ]; then
    node -e "
      const fs=require('fs');
      const p='./artifacts/data/bot-settings.json';
      let s={}; try{s=JSON.parse(fs.readFileSync(p,'utf8'));}catch{}
      s.apkFileId='$FILE_ID'; s.apkFileName='talim-platform.apk';
      fs.mkdirSync('./artifacts/data',{recursive:true});
      fs.writeFileSync(p,JSON.stringify(s,null,2));
      console.log('✅ file_id saqlandi');
    "
  fi
fi
echo "🎉 Tayyor!"
