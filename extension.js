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

const THEMED_ICON_NAME        = 'view-more-symbolic';
const THEMED_ICON_STYLE_CLASS = 'system-status-icon';

// TODO: Implement translation via Gettext

// Check for existing Mutter settings obj
const getMutterSettings = () => {
    try {
        const settings = ExtensionUtils.getSettings(MUTTER_SETTINGS);
        return settings;
    }
    catch (e) {
        log(`Unable to retrieve existing "${MUTTER_SETTINGS}" settings obj. Creating.`)
    }
    return new Gio.Settings({ schema_id: MUTTER_SETTINGS });
};

let Extension = class Extension extends PanelMenu.Button {
    _init() {
        super._init(0.0, `${Me.metadata.name} Extension`, false);

        this.settings = getMutterSettings();

        // Add an icon and menu item
        // TODO: Find appropriate icon;
        let icon = new St.Icon({
            gicon: new Gio.ThemedIcon({ name: THEMED_ICON_NAME }),
            style_class: THEMED_ICON_STYLE_CLASS,
        });
        this.actor.add_child(icon);

        // Get original activities overlay key (to restore later)
        this.overlayKeyOriginal = this.settings.get_string(MUTTER_OVERLAY_KEY);

        // Add menu items and actions
        const offItem = new PopupMenu.PopupMenuItem('Activities Overlay Key Off');
        offItem.actor.visible = true;
        offItem.connect('activate', () => {
            this.settings.set_string(MUTTER_OVERLAY_KEY, '');
            onItem.actor.visible = true;
            offItem.actor.visible = false;
        });

        const onItem  = new PopupMenu.PopupMenuItem('Activities Overlay Key On');
        onItem.actor.visible = false;
        onItem.connect('activate', () => {
            this.settings.set_string(MUTTER_OVERLAY_KEY, this.overlayKeyOriginal);
            onItem.actor.visible = false;
            offItem.actor.visible = true;
        });

        this.menu.addMenuItem(onItem);
        this.menu.addMenuItem(offItem);
    }

    destroy() {
        this.settings.set_string(MUTTER_OVERLAY_KEY, this.overlayKeyOriginal);

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

    Main.panel.addToStatusArea(`${Me.metadata.name}  Extension`, ext);
}

function disable() {
    log(`disabling ${Me.metadata.name} version ${Me.metadata.version}`);

    if (ext !== null) {
        ext.destroy();
        ext = null;
    }
}