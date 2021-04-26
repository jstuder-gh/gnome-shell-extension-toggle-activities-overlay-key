'use strict';

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const St = imports.gi.St;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

// Compatibility checks
const Config = imports.misc.config;
const SHELL_MINOR = parseInt(Config.PACKAGE_VERSION.split('.')[1]);

const MUTTER_SETTINGS    = 'org.gnome.mutter';
const MUTTER_OVERLAY_KEY = 'overlay-key';

// Set Left Win key to Meta
const DESKTOP_SETTINGS   = 'org.gnome.desktop.input-sources';
const DESKTOP_XKB_OPTS_KEY = 'xkb-options';
const DESKTOP_XKB_OPTS_VAL = 'altwin:left_meta_win';

const THEMED_ICON_NAME        = 'view-more-symbolic';
const THEMED_ICON_STYLE_CLASS = 'system-status-icon';

// TODO: Implement translation via Gettext

// Check for existing Mutter settings obj
const getSettings = (settingsKey) => {
    try {
        const settings = ExtensionUtils.getSettings(settingsKey);
        return settings;
    }
    catch (e) {
        log(`Unable to retrieve existing "${settingsKey}" settings obj. Creating.`)
    }
    return new Gio.Settings({ schema_id: settingsKey });
};

let Extension = class Extension extends PanelMenu.Button {
    _init() {
        super._init(0.0, `${Me.metadata.name} Extension`, false);

        this.mutterSettings  = getSettings(MUTTER_SETTINGS);
        this.desktopSettings = getSettings(DESKTOP_SETTINGS);

        // Add an icon and menu item
        // TODO: Find appropriate icon;
        let icon = new St.Icon({
            gicon: new Gio.ThemedIcon({ name: THEMED_ICON_NAME }),
            style_class: THEMED_ICON_STYLE_CLASS,
        });
        this.actor.add_child(icon);

        // Get original activities overlay key (to restore later)
        this.overlayKeyOriginal = this.mutterSettings.get_string(MUTTER_OVERLAY_KEY);
        this.xkbOptsOriginal    = this.desktopSettings.get_strv(DESKTOP_XKB_OPTS_KEY);
        log(`Overlay Key Orig IS: ${this.overlayKeyOriginal}`);
        log(`Xkb-opts Orig IS: ${this.xkbOptsOriginal}`);

        // Create modified xkb-options with meta key set (filtering duplicates)
        this.xkbOptsModified = Array.from(new Set([
            ...this.xkbOptsOriginal,
            DESKTOP_XKB_OPTS_VAL,
        ]));
        log(`Xkb-opts Modified IS: ${this.xkbOptsModified}`);


        // Add menu items and actions
        const offItem = new PopupMenu.PopupMenuItem('Activities Overlay Key Off');
        offItem.actor.visible = true;
        offItem.connect('activate', () => {
            this.mutterSettings.set_string(MUTTER_OVERLAY_KEY, '');
            this.desktopSettings.set_strv(DESKTOP_XKB_OPTS_KEY, this.xkbOptsModified);
            onItem.actor.visible = true;
            offItem.actor.visible = false;
        });

        const onItem  = new PopupMenu.PopupMenuItem('Activities Overlay Key On');
        onItem.actor.visible = false;
        onItem.connect('activate', () => {
            this.mutterSettings.set_string(MUTTER_OVERLAY_KEY, this.overlayKeyOriginal);
            this.desktopSettings.set_strv(DESKTOP_XKB_OPTS_KEY, this.xkbOptsOriginal);
            onItem.actor.visible = false;
            offItem.actor.visible = true;
        });

        this.menu.addMenuItem(onItem);
        this.menu.addMenuItem(offItem);
    }

    destroy() {
        this.mutterSettings.set_string(MUTTER_OVERLAY_KEY, this.overlayKeyOriginal);
        this.desktopSettings.set_strv(DESKTOP_XKB_OPTS_KEY, this.xkbOptsOriginal);

        super.destroy();
    }
};

if (SHELL_MINOR > 30) {
    Extension = GObject.registerClass(
        { GTypeName: 'Extension' },
        Extension,
    );
}

let ext = null;

function init() {
    log(`initializing ${Me.metadata.name} version ${Me.metadata.version}`);
}

function enable() {
    log(`enabling ${Me.metadata.name} version ${Me.metadata.version}`);

    ext = new Extension();

    // Place menu to the left of the "Activities" entry
    const index = Main.sessionMode.panel.left.indexOf('activities');
    Main.panel.addToStatusArea(`${Me.metadata.name}  Extension`, ext, index, 'left');
}

function disable() {
    log(`disabling ${Me.metadata.name} version ${Me.metadata.version}`);

    if (ext !== null) {
        ext.destroy();
        ext = null;
    }
}
