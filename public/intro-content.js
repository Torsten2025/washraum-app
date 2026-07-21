(function exposeWaschZeitIntroCatalog(global) {
  'use strict';

  function chapter(role, language, data) {
    return Object.freeze({
      ...data,
      role,
      language,
      tts: data.transcript,
      visual: Object.freeze({ ...data.visual })
    });
  }

  function introduction(role, language, title, description, chapterData) {
    const chapters = chapterData.map((data) => chapter(role, language, data));
    const seenIds = new Set();
    let previousStart = -1;

    for (const item of chapters) {
      if (!item.id || seenIds.has(item.id)) {
        throw new Error(`Invalid or duplicate intro chapter id: ${item.id || '(empty)'}`);
      }
      if (!Number.isFinite(item.startTime) || item.startTime <= previousStart) {
        throw new Error(`Intro chapter start times must increase: ${role}/${language}/${item.id}`);
      }
      if (!Number.isFinite(item.duration) || item.duration <= 0) {
        throw new Error(`Intro chapter duration must be positive: ${role}/${language}/${item.id}`);
      }
      if (!item.title || !item.description || !item.caption || !item.transcript || !item.scene) {
        throw new Error(`Intro chapter content is incomplete: ${role}/${language}/${item.id}`);
      }
      seenIds.add(item.id);
      previousStart = item.startTime;
    }

    const last = chapters[chapters.length - 1];
    return Object.freeze({
      id: `${role}-${language}`,
      title,
      description,
      language,
      role,
      totalDuration: last ? last.startTime + last.duration : 0,
      chapters: Object.freeze(chapters)
    });
  }

  const residentDe = introduction(
    'resident',
    'de',
    'Willkommen bei WaschZeit',
    'Die wichtigsten Schritte fuer dein Wohnungskonto, deine Buchungen und einen entspannten Waschalltag.',
    [
      {
        id: 'welcome-setup',
        title: 'Anmelden und persoenlich einrichten',
        description: 'Anmeldung, Profil, Sprache und Benachrichtigungen sicher einrichten.',
        startTime: 0,
        duration: 24,
        caption: 'Melde dich mit deiner persoenlichen E-Mail-Adresse an und richte Profil, Sprache und Hinweise ein.',
        transcript: 'Willkommen bei WaschZeit. Du meldest dich mit deiner persoenlichen E-Mail-Adresse und deinem Passwort an. Unter Einstellungen pruefst du deinen Namen, deine Sprache und die gewuenschten Benachrichtigungen. Deine Buchungen bleiben dabei immer deiner Wohnung zugeordnet.',
        scene: 'resident-welcome-setup',
        visual: { kind: 'app', view: 'settings', focus: 'profile-and-language' }
      },
      {
        id: 'calendar-orientation',
        title: 'Woche und Monat ueberblicken',
        description: 'Freie, belegte und gesperrte Zeiten im Kalender erkennen.',
        startTime: 24,
        duration: 28,
        caption: 'Die Wochenansicht hilft beim Buchen, die Monatsansicht zeigt den gemeinsamen Plan.',
        transcript: 'Im Wochenkalender findest du schnell einen passenden freien Termin. Die Monatsansicht zeigt dir den gemeinsamen Waschplan und hilft bei der laengerfristigen Orientierung. Vergangene, belegte oder gesperrte Zeiten sind klar gekennzeichnet und koennen nicht gebucht werden.',
        scene: 'resident-calendar-orientation',
        visual: { kind: 'app', view: 'calendar', focus: 'week-and-month' }
      },
      {
        id: 'book-wash-package',
        title: 'Waschpaket buchen',
        description: 'Zeit, Waschmaschine und passende Trocknung gemeinsam auswaehlen.',
        startTime: 52,
        duration: 30,
        caption: 'Waehle Datum und Zeit, danach Waschmaschine, Trockenraum und bei Bedarf einen Tumbler.',
        transcript: 'Fuer ein Waschpaket waehlst du zuerst einen Tag und ein freies Zeitfenster. Danach entscheidest du dich fuer eine Waschmaschine und kannst einen passenden Trockenraum oder Tumbler ergaenzen. Die App prueft alle Hausregeln, bevor sie das Paket gemeinsam speichert.',
        scene: 'resident-book-wash-package',
        visual: { kind: 'app', view: 'booking-assistant', focus: 'complete-package' }
      },
      {
        id: 'manage-own-bookings',
        title: 'Eigene Buchungen verwalten',
        description: 'Naechste Termine pruefen und einzelne Bestandteile sicher verwalten.',
        startTime: 82,
        duration: 28,
        caption: 'Unter Meine Buchungen findest du deine Termine und die jeweils moeglichen Aktionen.',
        transcript: 'Unter Meine Buchungen siehst du deine kommenden Termine in zeitlicher Reihenfolge. Dort erkennst du Maschine, Raum, Datum und Zeitfenster. Du kannst nur deine eigenen Buchungen veraendern; Buchungen anderer Wohnungen bleiben geschuetzt.',
        scene: 'resident-manage-own-bookings',
        visual: { kind: 'app', view: 'my-bookings', focus: 'next-booking-actions' }
      },
      {
        id: 'release-or-cancel',
        title: 'Frueher freigeben oder absagen',
        description: 'Zwischen einer vorzeitigen Freigabe und einer Absage unterscheiden.',
        startTime: 110,
        duration: 26,
        caption: 'Gib einen noch laufenden Termin frueher frei oder sage einen kuenftigen Termin ab.',
        transcript: 'Bist du frueher fertig, kannst du die nicht mehr benoetigte Maschine oder den Raum freigeben. Andere Bewohner erhalten dann einen neutralen Hinweis auf die wieder freie Zeit. Eine Absage entfernt dagegen deine noch nicht begonnene Buchung vollstaendig.',
        scene: 'resident-release-or-cancel',
        visual: { kind: 'app', view: 'booking-details', focus: 'release-and-cancel' }
      },
      {
        id: 'messages-and-filters',
        title: 'Mitteilungen passend filtern',
        description: 'Freigaben, Systemhinweise und persoenliche Filter sinnvoll nutzen.',
        startTime: 136,
        duration: 28,
        caption: 'Im Mitteilungszentrum siehst du relevante Hinweise und stellst deine persoenlichen Filter ein.',
        transcript: 'Das Mitteilungszentrum sammelt aktuelle Hinweise, zum Beispiel eine vorzeitig freigegebene Maschine. Mit deinen persoenlichen Filtern bestimmst du, welche Ressourcentypen und Zeitfenster fuer dich interessant sind. Eigene oder bereits ungueltige Freigaben werden nicht als buchbarer Hinweis angeboten.',
        scene: 'resident-messages-and-filters',
        visual: { kind: 'app', view: 'message-center', focus: 'filters-and-release' }
      },
      {
        id: 'report-issue',
        title: 'Stoerung melden',
        description: 'Eine Beobachtung sachlich und mit den noetigen Angaben weitergeben.',
        startTime: 164,
        duration: 26,
        caption: 'Melde Defekte oder Probleme direkt am betroffenen Geraet oder Raum.',
        transcript: 'Wenn eine Maschine oder ein Raum nicht richtig funktioniert, erstellst du eine sachliche Stoerungsmeldung. Waehle die betroffene Ressource und beschreibe kurz, was du beobachtet hast. Der Haus-Admin uebernimmt danach die technische Bearbeitung und entscheidet ueber eine Sperre.',
        scene: 'resident-report-issue',
        visual: { kind: 'app', view: 'issue-report', focus: 'resource-and-description' }
      },
      {
        id: 'qr-resident-access',
        title: 'Weiteres Haushaltsmitglied verbinden',
        description: 'Einen zeitlich begrenzten QR-Zugang fuer dieselbe Wohnung erzeugen.',
        startTime: 190,
        duration: 26,
        caption: 'Verbinde ein weiteres Haushaltsmitglied per QR-Code mit demselben Wohnungskonto.',
        transcript: 'Unter App und Geraet kannst du einen kurz gueltigen QR-Code fuer ein weiteres Haushaltsmitglied erzeugen. Die Person erhaelt einen eigenen persoenlichen Zugang, wird aber derselben Wohnung zugeordnet. Adminrechte werden durch den QR-Code niemals uebertragen.',
        scene: 'resident-qr-resident-access',
        visual: { kind: 'app', view: 'settings-device', focus: 'partner-qr-code' }
      },
      {
        id: 'help-privacy-logout',
        title: 'Hilfe, Datenschutz und Abmeldung',
        description: 'Regeln nachlesen, Dateninformationen finden und die Sitzung sicher beenden.',
        startTime: 216,
        duration: 26,
        caption: 'Hilfe und Datenschutz findest du in den Einstellungen; melde dich auf fremden Geraeten immer ab.',
        transcript: 'Unter Hilfe und Regeln kannst du die wichtigsten Ablaeufe jederzeit nachlesen. Sicherheit und Daten erklaert, welche Angaben gespeichert werden und welche Rechte du hast. Nutzt du ein fremdes oder gemeinsam verwendetes Geraet, beendest du deine Sitzung anschliessend mit Abmelden.',
        scene: 'resident-help-privacy-logout',
        visual: { kind: 'app', view: 'settings', focus: 'help-privacy-logout' }
      }
    ]
  );

  const residentEn = introduction(
    'resident',
    'en',
    'Welcome to WaschZeit',
    'The essential steps for your apartment account, bookings and an easy laundry routine.',
    [
      {
        id: 'welcome-setup',
        title: 'Sign in and set up your profile',
        description: 'Configure your sign-in, profile, language and notifications safely.',
        startTime: 0,
        duration: 24,
        caption: 'Sign in with your personal email address and set up your profile, language and notifications.',
        transcript: 'Welcome to WaschZeit. Sign in with your personal email address and password. In Settings, check your name, language and notification preferences. Your bookings always remain assigned to your apartment.',
        scene: 'resident-welcome-setup',
        visual: { kind: 'app', view: 'settings', focus: 'profile-and-language' }
      },
      {
        id: 'calendar-orientation',
        title: 'Explore the week and month',
        description: 'Recognize available, occupied and blocked times in the calendar.',
        startTime: 24,
        duration: 28,
        caption: 'Use the week view to book and the month view to see the shared schedule.',
        transcript: 'The weekly calendar helps you find a suitable available time quickly. The monthly view shows the shared laundry schedule and supports longer-term planning. Past, occupied or blocked times are clearly marked and cannot be booked.',
        scene: 'resident-calendar-orientation',
        visual: { kind: 'app', view: 'calendar', focus: 'week-and-month' }
      },
      {
        id: 'book-wash-package',
        title: 'Book a laundry package',
        description: 'Choose a time, washing machine and matching drying option together.',
        startTime: 52,
        duration: 30,
        caption: 'Choose a date and time, then add a washing machine, drying room and tumbler if needed.',
        transcript: 'To book a laundry package, first choose a day and an available time slot. Then select a washing machine and add a suitable drying room or tumbler if needed. The app checks all house rules before saving the package as one transaction.',
        scene: 'resident-book-wash-package',
        visual: { kind: 'app', view: 'booking-assistant', focus: 'complete-package' }
      },
      {
        id: 'manage-own-bookings',
        title: 'Manage your bookings',
        description: 'Review upcoming appointments and manage their individual parts safely.',
        startTime: 82,
        duration: 28,
        caption: 'My Bookings lists your appointments and the actions currently available for each one.',
        transcript: 'My Bookings shows your upcoming appointments in chronological order. You can see the machine, room, date and time slot for each booking. You may only change your own bookings; bookings made by other apartments remain protected.',
        scene: 'resident-manage-own-bookings',
        visual: { kind: 'app', view: 'my-bookings', focus: 'next-booking-actions' }
      },
      {
        id: 'release-or-cancel',
        title: 'Release early or cancel',
        description: 'Understand the difference between an early release and a cancellation.',
        startTime: 110,
        duration: 26,
        caption: 'Release an active booking early or cancel a future appointment.',
        transcript: 'If you finish early, release the machine or room you no longer need. Other residents can then receive a neutral notice about the newly available time. Cancelling instead removes your future booking completely before it starts.',
        scene: 'resident-release-or-cancel',
        visual: { kind: 'app', view: 'booking-details', focus: 'release-and-cancel' }
      },
      {
        id: 'messages-and-filters',
        title: 'Filter notifications',
        description: 'Use release notices, system messages and personal filters effectively.',
        startTime: 136,
        duration: 28,
        caption: 'The notification center shows relevant updates and lets you set personal filters.',
        transcript: 'The notification center collects current information, such as a washing machine released early. Your personal filters determine which resource types and time slots interest you. Your own releases and notices that are no longer valid are not offered as bookable opportunities.',
        scene: 'resident-messages-and-filters',
        visual: { kind: 'app', view: 'message-center', focus: 'filters-and-release' }
      },
      {
        id: 'report-issue',
        title: 'Report a problem',
        description: 'Share an observation objectively with the necessary details.',
        startTime: 164,
        duration: 26,
        caption: 'Report faults or problems directly for the affected machine or room.',
        transcript: 'If a machine or room does not work correctly, create a factual issue report. Select the affected resource and briefly describe what you observed. The house administrator then handles the technical process and decides whether the resource must be blocked.',
        scene: 'resident-report-issue',
        visual: { kind: 'app', view: 'issue-report', focus: 'resource-and-description' }
      },
      {
        id: 'qr-resident-access',
        title: 'Connect another household member',
        description: 'Create temporary QR access for the same apartment.',
        startTime: 190,
        duration: 26,
        caption: 'Use a QR code to connect another household member to the same apartment account.',
        transcript: 'In App and Device, you can create a short-lived QR code for another household member. That person receives an individual sign-in but is assigned to the same apartment. Administrator permissions are never transferred through this QR code.',
        scene: 'resident-qr-resident-access',
        visual: { kind: 'app', view: 'settings-device', focus: 'partner-qr-code' }
      },
      {
        id: 'help-privacy-logout',
        title: 'Help, privacy and sign out',
        description: 'Review the rules, find data information and end your session safely.',
        startTime: 216,
        duration: 26,
        caption: 'Find help and privacy details in Settings, and always sign out on shared devices.',
        transcript: 'Help and Rules lets you review the most important workflows at any time. Security and Data explains what information is stored and which rights you have. When using a shared or unfamiliar device, always end your session by signing out.',
        scene: 'resident-help-privacy-logout',
        visual: { kind: 'app', view: 'settings', focus: 'help-privacy-logout' }
      }
    ]
  );

  const houseAdminDe = introduction(
    'house_admin',
    'de',
    'WaschZeit fuer Haus-Admins',
    'Dein Arbeitsablauf fuer Bewohnerkonten, Geraete, Stoerungen und die sichere Verwaltung eines Hauses.',
    [
      {
        id: 'switch-plan-admin',
        title: 'Waschplan und Verwaltung trennen',
        description: 'Zwischen der privaten Bewohneransicht und administrativen Aufgaben wechseln.',
        startTime: 0,
        duration: 24,
        caption: 'Nutze Mein Waschplan privat und Verwalten fuer deine Aufgaben als Haus-Admin.',
        transcript: 'Als Haus-Admin kannst du zugleich Bewohner sein. Mein Waschplan enthaelt deine privaten Wohnungsbuchungen. Unter Verwalten bearbeitest du Aufgaben fuer das Haus. Jede Adminaktion wird deiner persoenlichen Identitaet zugeordnet und nicht dem gemeinsamen Wohnungskonto.',
        scene: 'house-admin-switch-plan-admin',
        visual: { kind: 'app', view: 'main-navigation', focus: 'book-and-admin-modes' }
      },
      {
        id: 'admin-overview',
        title: 'Verwaltungsuebersicht priorisieren',
        description: 'Dringende Aufgaben, Warnungen und Informationen richtig einordnen.',
        startTime: 24,
        duration: 26,
        caption: 'Beginne bei dringenden Stoerungen, Sperren und offenen Funktionspruefungen.',
        transcript: 'Die Verwaltungsuebersicht stellt wichtige Aufgaben vor reine Kennzahlen. Pruefe zuerst dringende Stoerungen, gesperrte Geraete und offene Funktionspruefungen. Danach folgen Einladungen, Kontohinweise, Dauertermine und allgemeine Informationen deines Hauses.',
        scene: 'house-admin-overview',
        visual: { kind: 'app', view: 'admin-overview', focus: 'priority-actions' }
      },
      {
        id: 'apartments-invitations',
        title: 'Wohnungen und Einladungen',
        description: 'Wohnungen anlegen und Bewohner ausschliesslich per E-Mail einladen.',
        startTime: 50,
        duration: 28,
        caption: 'Lege die Wohnung mit Klingelschildname an und sende danach eine einmalige Einladung.',
        transcript: 'Lege fuer einen Einzug zuerst die stabile Wohnungsbezeichnung und den Namen vom Klingelschild fest. Hinterlege die E-Mail-Adresse des Bewohners und sende eine zeitlich begrenzte Einladung. Erst beim Annehmen der Einladung entsteht der persoenliche Zugang mit der bereits richtigen Wohnungszuordnung.',
        scene: 'house-admin-apartments-invitations',
        visual: { kind: 'app', view: 'admin-apartments', focus: 'create-and-invite' }
      },
      {
        id: 'accounts-recovery',
        title: 'Konten und Wiederherstellung',
        description: 'Kontostatus pruefen, Einladungen erneuern und sichere Wiederherstellung begleiten.',
        startTime: 78,
        duration: 28,
        caption: 'Pruefe Identitaet und Wohnungsbezug, bevor du ein Konto entsperrst oder korrigierst.',
        transcript: 'In der Kontenverwaltung erkennst du aktive, eingeladene oder gesperrte Personen. Bei Wiederherstellungsbedarf pruefst du zuerst Identitaet, E-Mail-Adresse und Wohnungszuordnung. Aendere niemals eine fremde E-Mail-Adresse nur, um selbst einen Passwortlink zu erhalten.',
        scene: 'house-admin-accounts-recovery',
        visual: { kind: 'app', view: 'admin-accounts', focus: 'recovery-status' }
      },
      {
        id: 'equipment-management',
        title: 'Geraete und Raeume verwalten',
        description: 'Waschmaschinen, Tumbler und Trockenraeume korrekt fuehren.',
        startTime: 106,
        duration: 26,
        caption: 'Lege Ressourcen eindeutig an und deaktiviere sie nur mit nachvollziehbarem Grund.',
        transcript: 'Unter Haus und Geraete verwaltest du Waschmaschinen, Tumbler und Trockenraeume deines Hauses. Verwende eindeutige Namen, damit Kalender, Meldung und Tagebuch dieselbe Ressource meinen. Eine deaktivierte oder gesperrte Ressource darf nicht mehr buchbar erscheinen.',
        scene: 'house-admin-equipment-management',
        visual: { kind: 'app', view: 'admin-equipment', focus: 'resource-list' }
      },
      {
        id: 'machine-room-logbook',
        title: 'Maschinen- und Raumtagebuch',
        description: 'Technische Ereignisse dauerhaft und nachvollziehbar dokumentieren.',
        startTime: 132,
        duration: 28,
        caption: 'Ergaenze das Tagebuch sachlich; vorhandene technische Eintraege bleiben erhalten.',
        transcript: 'Das Maschinen- und Raumtagebuch dokumentiert Meldungen, Entscheidungen und Arbeiten dauerhaft. Formuliere Beobachtungen und Massnahmen sachlich mit Datum und betroffener Ressource. Bestehende Eintraege werden nicht geloescht, sondern durch den naechsten Schritt ergaenzt oder abgeschlossen.',
        scene: 'house-admin-machine-room-logbook',
        visual: { kind: 'app', view: 'equipment-logbook', focus: 'history' }
      },
      {
        id: 'incident-lifecycle',
        title: 'Stoerung bis Freigabe bearbeiten',
        description: 'Meldung, Sperre, Reparatur, Funktionspruefung und Freigabe lueckenlos ausfuehren.',
        startTime: 160,
        duration: 30,
        caption: 'Folge immer der Kette Meldung, Sperre, Reparatur, Funktionspruefung und Freigabe.',
        transcript: 'Pruefe eine Bewohnermeldung und sperre die Ressource, wenn die sichere Nutzung nicht gewaehrleistet ist. Dokumentiere danach Reparatur und Funktionspruefung. Erst eine erfolgreiche Pruefung mit Abschlussnotiz erlaubt die Freigabe und macht die Ressource wieder buchbar.',
        scene: 'house-admin-incident-lifecycle',
        visual: { kind: 'app', view: 'equipment-logbook', focus: 'incident-workflow' }
      },
      {
        id: 'recurring-appointments',
        title: 'Dauertermine pflegen',
        description: 'Wiederkehrende Sperren und reservierte Zeiten planbar verwalten.',
        startTime: 190,
        duration: 26,
        caption: 'Nutze Dauertermine fuer begruendete wiederkehrende Zeiten und pruefe ihre Laufzeit.',
        transcript: 'Dauertermine eignen sich fuer wiederkehrende, vom Haus verantwortete Belegungen oder Sperrzeiten. Waehle Ressource, Wochentag, Zeitfenster und Laufzeit bewusst. Pruefe bestehende Eintraege regelmaessig, damit ueberholte Termine keine Kapazitaet blockieren.',
        scene: 'house-admin-recurring-appointments',
        visual: { kind: 'app', view: 'admin-recurring', focus: 'schedule-and-validity' }
      },
      {
        id: 'house-analytics',
        title: 'Auswertung verstehen',
        description: 'Auslastung und Auffaelligkeiten ohne Bewertung einzelner Bewohner einordnen.',
        startTime: 216,
        duration: 26,
        caption: 'Nutze die Auswertung fuer Betrieb und Kapazitaet, nicht fuer einen Bewohnervergleich.',
        transcript: 'Die Auswertung zeigt Nutzung, Auslastung und betriebliche Auffaelligkeiten deines Hauses. Sie hilft bei Kapazitaetsfragen und Wartungsentscheidungen. Verwende Kennzahlen nicht als Rangliste oder zur oeffentlichen Bewertung einzelner Bewohner.',
        scene: 'house-admin-house-analytics',
        visual: { kind: 'app', view: 'admin-analytics', focus: 'utilization' }
      },
      {
        id: 'critical-password-confirmation',
        title: 'Kritische Aktionen bestaetigen',
        description: 'Aktuelles Passwort und exakten Bestaetigungstext bewusst einsetzen.',
        startTime: 242,
        duration: 28,
        caption: 'Kontrolliere Ziel und Auswirkung, bevor du eine kritische Aktion mit deinem Passwort bestaetigst.',
        transcript: 'Sicherheitsrelevante Aktionen verlangen dein aktuelles Passwort und teilweise einen exakten Bestaetigungstext. Lies Zielkonto, Haus und Auswirkung vor dem Absenden noch einmal. Teile dein Passwort niemals und fuehre eine kritische Aktion nicht auf Zuruf ohne eigene Pruefung aus.',
        scene: 'house-admin-critical-password-confirmation',
        visual: { kind: 'app', view: 'admin-confirmation', focus: 'password-and-confirmation' }
      },
      {
        id: 'house-admin-boundaries',
        title: 'Grenzen der Haus-Adminrolle',
        description: 'Hausgrenze, Bewohnerrechte und Superadminaufgaben sicher unterscheiden.',
        startTime: 270,
        duration: 28,
        caption: 'Du verwaltest dein Haus, aber keine fremden Haeuser und keine globalen Systemeinstellungen.',
        transcript: 'Als Haus-Admin bearbeitest du Wohnungen, Konten, Ressourcen und technische Vorgaenge deines zugewiesenen Hauses. Du buchst keine privaten Termine im Namen anderer Bewohner. Andere Haeuser, globale Systemeinstellungen und Superadminrechte bleiben ausserhalb deiner Rolle.',
        scene: 'house-admin-boundaries',
        visual: { kind: 'app', view: 'admin-overview', focus: 'role-boundary' }
      }
    ]
  );

  const houseAdminEn = introduction(
    'house_admin',
    'en',
    'WaschZeit for house administrators',
    'Your workflow for resident accounts, equipment, incidents and secure administration of one house.',
    [
      {
        id: 'switch-plan-admin',
        title: 'Separate your plan and administration',
        description: 'Switch between your private resident view and administrative tasks.',
        startTime: 0,
        duration: 24,
        caption: 'Use My Laundry Plan privately and Administration for your house administrator duties.',
        transcript: 'As a house administrator, you may also be a resident. My Laundry Plan contains your private apartment bookings. Administration is where you handle tasks for the house. Each administrative action is attributed to your personal identity, not to the shared apartment account.',
        scene: 'house-admin-switch-plan-admin',
        visual: { kind: 'app', view: 'main-navigation', focus: 'book-and-admin-modes' }
      },
      {
        id: 'admin-overview',
        title: 'Prioritize the administration overview',
        description: 'Understand urgent tasks, warnings and information in the right order.',
        startTime: 24,
        duration: 26,
        caption: 'Start with urgent incidents, blocked equipment and pending functional checks.',
        transcript: 'The administration overview places important tasks before general figures. First review urgent incidents, blocked equipment and pending functional checks. Invitations, account notices, recurring appointments and general information for your house follow after those tasks.',
        scene: 'house-admin-overview',
        visual: { kind: 'app', view: 'admin-overview', focus: 'priority-actions' }
      },
      {
        id: 'apartments-invitations',
        title: 'Apartments and invitations',
        description: 'Create apartments and invite residents only by email.',
        startTime: 50,
        duration: 28,
        caption: 'Create the apartment with its doorbell name, then send a one-time invitation.',
        transcript: 'For a new resident, first define the stable apartment label and the name shown on the doorbell. Add the resident email address and send a time-limited invitation. The personal sign-in is created only when the invitation is accepted, with the correct apartment already assigned.',
        scene: 'house-admin-apartments-invitations',
        visual: { kind: 'app', view: 'admin-apartments', focus: 'create-and-invite' }
      },
      {
        id: 'accounts-recovery',
        title: 'Accounts and recovery',
        description: 'Review account status, renew invitations and support secure recovery.',
        startTime: 78,
        duration: 28,
        caption: 'Verify identity and apartment assignment before unlocking or correcting an account.',
        transcript: 'Account administration shows active, invited and blocked people. Before helping with recovery, verify the identity, email address and apartment assignment. Never replace another person\'s email address merely to receive their password reset link yourself.',
        scene: 'house-admin-accounts-recovery',
        visual: { kind: 'app', view: 'admin-accounts', focus: 'recovery-status' }
      },
      {
        id: 'equipment-management',
        title: 'Manage equipment and rooms',
        description: 'Maintain washing machines, tumblers and drying rooms correctly.',
        startTime: 106,
        duration: 26,
        caption: 'Use clear resource names and deactivate equipment only for a documented reason.',
        transcript: 'House and Equipment is where you manage washing machines, tumblers and drying rooms for your house. Use clear names so the calendar, issue report and logbook refer to the same resource. A deactivated or blocked resource must no longer appear as bookable.',
        scene: 'house-admin-equipment-management',
        visual: { kind: 'app', view: 'admin-equipment', focus: 'resource-list' }
      },
      {
        id: 'machine-room-logbook',
        title: 'Machine and room logbook',
        description: 'Document technical events permanently and traceably.',
        startTime: 132,
        duration: 28,
        caption: 'Add factual logbook notes; existing technical entries remain intact.',
        transcript: 'The machine and room logbook preserves reports, decisions and work performed. Record observations and measures factually with the date and affected resource. Existing entries are not deleted; they are extended or completed by the next workflow step.',
        scene: 'house-admin-machine-room-logbook',
        visual: { kind: 'app', view: 'equipment-logbook', focus: 'history' }
      },
      {
        id: 'incident-lifecycle',
        title: 'Handle an incident through release',
        description: 'Complete the report, block, repair, functional check and release without gaps.',
        startTime: 160,
        duration: 30,
        caption: 'Always follow the sequence: report, block, repair, functional check and release.',
        transcript: 'Review a resident report and block the resource if safe use is not assured. Then document the repair and functional check. Only a successful check with a closing note permits release and makes the resource bookable again.',
        scene: 'house-admin-incident-lifecycle',
        visual: { kind: 'app', view: 'equipment-logbook', focus: 'incident-workflow' }
      },
      {
        id: 'recurring-appointments',
        title: 'Maintain recurring appointments',
        description: 'Manage recurring blocks and reserved times predictably.',
        startTime: 190,
        duration: 26,
        caption: 'Use recurring appointments for justified repeating times and review their validity period.',
        transcript: 'Recurring appointments are suitable for repeating house-managed occupancy or blocked times. Choose the resource, weekday, time slot and validity period carefully. Review existing entries regularly so obsolete appointments do not block capacity.',
        scene: 'house-admin-recurring-appointments',
        visual: { kind: 'app', view: 'admin-recurring', focus: 'schedule-and-validity' }
      },
      {
        id: 'house-analytics',
        title: 'Understand analytics',
        description: 'Interpret utilization and notable patterns without judging individual residents.',
        startTime: 216,
        duration: 26,
        caption: 'Use analytics for operations and capacity, not to compare residents.',
        transcript: 'Analytics shows usage, utilization and operational patterns for your house. It supports capacity planning and maintenance decisions. Do not use these figures as a ranking or for public evaluation of individual residents.',
        scene: 'house-admin-house-analytics',
        visual: { kind: 'app', view: 'admin-analytics', focus: 'utilization' }
      },
      {
        id: 'critical-password-confirmation',
        title: 'Confirm critical actions',
        description: 'Use your current password and exact confirmation text deliberately.',
        startTime: 242,
        duration: 28,
        caption: 'Check the target and impact before confirming a critical action with your password.',
        transcript: 'Security-sensitive actions require your current password and sometimes an exact confirmation phrase. Recheck the target account, house and impact before submitting. Never share your password or perform a critical action on request without verifying it yourself.',
        scene: 'house-admin-critical-password-confirmation',
        visual: { kind: 'app', view: 'admin-confirmation', focus: 'password-and-confirmation' }
      },
      {
        id: 'house-admin-boundaries',
        title: 'Know the house administrator boundaries',
        description: 'Distinguish the house boundary, resident rights and super administrator tasks.',
        startTime: 270,
        duration: 28,
        caption: 'You administer your house, but not other houses or global system settings.',
        transcript: 'As a house administrator, you manage apartments, accounts, resources and technical workflows for your assigned house. You do not create private bookings on behalf of residents. Other houses, global system settings and super administrator rights remain outside your role.',
        scene: 'house-admin-boundaries',
        visual: { kind: 'app', view: 'admin-overview', focus: 'role-boundary' }
      }
    ]
  );

  const superadminDe = introduction(
    'superadmin',
    'de',
    'WaschZeit fuer Superadmins',
    'Hausuebergreifende Steuerung, sichere Rollenverwaltung und verantwortlicher Systembetrieb.',
    [
      {
        id: 'multi-house-overview',
        title: 'Mehrere Haeuser im Blick behalten',
        description: 'Kritische Aufgaben hausuebergreifend erkennen und richtig zuordnen.',
        startTime: 0,
        duration: 24,
        caption: 'Die Uebersicht zeigt kritische Probleme, Sicherungen und Systemwarnungen mit Hausbezug.',
        transcript: 'Als Superadmin siehst du den Zustand mehrerer Haeuser. Beginne mit kritischen Problemen, fehlenden Sicherungen, Wartungswarnungen und ungewoehnlichen Auditereignissen. Jeder Eintrag muss eindeutig zeigen, welches Haus betroffen ist, bevor du handelst.',
        scene: 'superadmin-multi-house-overview',
        visual: { kind: 'app', view: 'superadmin-overview', focus: 'cross-house-priorities' }
      },
      {
        id: 'switch-house',
        title: 'Das aktive Haus wechseln',
        description: 'Den Hauskontext kontrolliert wechseln und Aktionen korrekt zuordnen.',
        startTime: 24,
        duration: 28,
        caption: 'Pruefe vor jeder Aktion das oben ausgewaehlte Haus und den Namen in der Verwaltung.',
        transcript: 'Mit dem Hauswaehler wechselst du den aktiven Verwaltungskontext. Die folgenden Ansichten und Aktionen beziehen sich auf dieses Haus, bis du erneut wechselst. Kontrolliere deshalb Hausname und Zielobjekt besonders vor Sperren, Einladungen oder Kontoaenderungen.',
        scene: 'superadmin-switch-house',
        visual: { kind: 'app', view: 'admin-header', focus: 'house-selector' }
      },
      {
        id: 'house-lifecycle',
        title: 'Haeuser verwalten',
        description: 'Haeuser anlegen, Stammdaten bearbeiten und kontrolliert deaktivieren.',
        startTime: 52,
        duration: 28,
        caption: 'Lege Haeuser mit eindeutigen Stammdaten an und deaktiviere sie nur nach Folgenpruefung.',
        transcript: 'Superadmins koennen neue Haeuser mit eindeutiger Bezeichnung und Adresse anlegen. Aenderungen an Stammdaten wirken auf Verwaltung und Anzeige. Vor einer Deaktivierung pruefst du aktive Bewohner, Buchungen, Ressourcen, offene Vorgaenge und die notwendige Datensicherung.',
        scene: 'superadmin-house-lifecycle',
        visual: { kind: 'app', view: 'superadmin-houses', focus: 'create-edit-deactivate' }
      },
      {
        id: 'role-management',
        title: 'Rollen sicher verwalten',
        description: 'Bewohner-, Haus-Admin- und Superadminrechte getrennt und kumulativ vergeben.',
        startTime: 80,
        duration: 28,
        caption: 'Eine Identitaet kann mehrere Rollen besitzen; jede Berechtigung bleibt klar begrenzt.',
        transcript: 'Eine persoenliche Identitaet kann Bewohner eines Hauses, Haus-Admin und zusaetzlich Superadmin sein. Bewohnerbuchungen bleiben der Wohnung zugeordnet, waehrend Adminaktionen persoenlich protokolliert werden. Vergib nur die Rechte, die fuer die konkrete Aufgabe erforderlich sind.',
        scene: 'superadmin-role-management',
        visual: { kind: 'app', view: 'admin-roles', focus: 'cumulative-permissions' }
      },
      {
        id: 'superadmin-handover',
        title: 'Superadminrecht und Uebergabe',
        description: 'Superadminrechte vergeben, entziehen und eine Nachfolge kontrolliert vorbereiten.',
        startTime: 108,
        duration: 30,
        caption: 'Gib einem aktiven Haus-Admin zusaetzliche Superadminrechte, ohne deine eigenen automatisch zu verlieren.',
        transcript: 'Ein Superadmin kann einem aktiven Haus-Admin zusaetzliche Superadminrechte geben. Der bisherige Superadmin behaelt sein Recht, damit keine ungewollte alleinige Uebergabe entsteht. Entzug oder geplante Nachfolge verlangen Passwortbestaetigung, Auditspur und mindestens einen verbleibenden handlungsfaehigen Superadmin.',
        scene: 'superadmin-superadmin-handover',
        visual: { kind: 'app', view: 'system-responsibility', focus: 'grant-revoke-handover' }
      },
      {
        id: 'backup-external-storage',
        title: 'Backup und externe Sicherung',
        description: 'Lokale Sicherungen, externe Kopien und Wiederherstellbarkeit ueberwachen.',
        startTime: 138,
        duration: 30,
        caption: 'Eine erfolgreiche Sicherung zaehlt erst, wenn eine getrennte Kopie und Wiederherstellungspruefung vorhanden sind.',
        transcript: 'Im Systembereich kontrollierst du Zeitpunkt, Integritaet und Ziel der Datenbanksicherungen. Eine Kopie auf demselben Server allein schuetzt nicht vor einem vollstaendigen Ausfall. Richte eine externe Sicherung ein und pruefe regelmaessig, ob sich eine Sicherung tatsaechlich wiederherstellen laesst.',
        scene: 'superadmin-backup-external-storage',
        visual: { kind: 'app', view: 'system-backup', focus: 'local-external-restore' }
      },
      {
        id: 'maintenance-mode',
        title: 'Wartungsmodus steuern',
        description: 'Groessere Aenderungen ankundigen, absichern und kontrolliert abschliessen.',
        startTime: 168,
        duration: 28,
        caption: 'Sichere zuerst die Daten, aktiviere dann die Wartung und pruefe den Betrieb vor der Freigabe.',
        transcript: 'Nutze den Wartungsmodus fuer groessere Datenbank- oder Betriebsarbeiten. Informiere Bewohner, erstelle vorher eine Sicherung und verhindere waehrenddessen neue Veraenderungen. Nach der Arbeit pruefst du Health-Status und Kernfunktionen, bevor du den normalen Betrieb wieder freigibst.',
        scene: 'superadmin-maintenance-mode',
        visual: { kind: 'app', view: 'system-maintenance', focus: 'enable-check-release' }
      },
      {
        id: 'pilot-reset',
        title: 'Pilotdaten kontrolliert zuruecksetzen',
        description: 'Testbuchungen bereinigen, ohne Konten oder Nachweise versehentlich zu verlieren.',
        startTime: 196,
        duration: 28,
        caption: 'Nutze den Pilot-Reset nur nach Sicherung, Umfangspruefung und ausdruecklicher Freigabe.',
        transcript: 'Der Pilot-Reset ist keine normale Aufraeumfunktion. Pruefe genau, welche Buchungen und Testdaten entfernt werden, und erstelle unmittelbar vorher ein Backup. Konten, Tagebuchnachweise oder produktive Daten duerfen nicht unbeabsichtigt Teil des Resets sein.',
        scene: 'superadmin-pilot-reset',
        visual: { kind: 'app', view: 'system-pilot-reset', focus: 'scope-and-confirmation' }
      },
      {
        id: 'audit-system-status',
        title: 'Audit und Systemstatus pruefen',
        description: 'Administrative Aktionen, Version, Dienste und Auffaelligkeiten nachvollziehen.',
        startTime: 224,
        duration: 28,
        caption: 'Nutze Audit und Systemstatus, um Akteur, Haus, Zeitpunkt und Ergebnis zu pruefen.',
        transcript: 'Das Audit zeigt, wer eine administrative Aktion wann und fuer welches Haus ausgefuehrt hat. Der Systemstatus ergaenzt Version, Datenbank, E-Mail, Push, Backup und Wartungszustand. Ungewoehnliche Ereignisse werden geprueft und dokumentiert, aber nicht still aus dem Verlauf entfernt.',
        scene: 'superadmin-audit-system-status',
        visual: { kind: 'app', view: 'system-status', focus: 'audit-and-services' }
      },
      {
        id: 'critical-action-safety',
        title: 'Kritische Aktionen sicher ausfuehren',
        description: 'Vier-Augen-Denken, Passwortbestaetigung und Nachkontrolle anwenden.',
        startTime: 252,
        duration: 28,
        caption: 'Pruefe Ziel, Haus, Backup und Rueckweg, bevor du eine weitreichende Aktion bestaetigst.',
        transcript: 'Bei Rollenwechseln, Hausdeaktivierung, Wartung und Datenreset handelst du bewusst langsam. Pruefe Ziel, Haus, aktuelle Sicherung, Auswirkungen und Ruecksetzmoeglichkeit. Bestaetige mit deinem eigenen aktuellen Passwort, kontrolliere danach Audit und Systemstatus und dokumentiere offene Restpunkte.',
        scene: 'superadmin-critical-action-safety',
        visual: { kind: 'app', view: 'admin-confirmation', focus: 'preflight-and-verification' }
      }
    ]
  );

  const superadminEn = introduction(
    'superadmin',
    'en',
    'WaschZeit for super administrators',
    'Cross-house oversight, secure role management and responsible system operation.',
    [
      {
        id: 'multi-house-overview',
        title: 'Keep multiple houses in view',
        description: 'Recognize critical tasks across houses and assign them correctly.',
        startTime: 0,
        duration: 24,
        caption: 'The overview shows critical problems, backups and system warnings with their house context.',
        transcript: 'As a super administrator, you can see the condition of multiple houses. Start with critical problems, missing backups, maintenance warnings and unusual audit events. Every entry must clearly identify the affected house before you act.',
        scene: 'superadmin-multi-house-overview',
        visual: { kind: 'app', view: 'superadmin-overview', focus: 'cross-house-priorities' }
      },
      {
        id: 'switch-house',
        title: 'Switch the active house',
        description: 'Change house context deliberately and assign actions correctly.',
        startTime: 24,
        duration: 28,
        caption: 'Before every action, check the selected house and the name shown in Administration.',
        transcript: 'The house selector changes the active administration context. The following views and actions refer to that house until you switch again. Check the house name and target especially before blocks, invitations or account changes.',
        scene: 'superadmin-switch-house',
        visual: { kind: 'app', view: 'admin-header', focus: 'house-selector' }
      },
      {
        id: 'house-lifecycle',
        title: 'Manage houses',
        description: 'Create houses, edit master data and deactivate them in a controlled way.',
        startTime: 52,
        duration: 28,
        caption: 'Create houses with clear master data and deactivate them only after checking the impact.',
        transcript: 'Super administrators can create houses with a clear name and address. Master data changes affect administration and display. Before deactivation, review active residents, bookings, resources, open workflows and the required data backup.',
        scene: 'superadmin-house-lifecycle',
        visual: { kind: 'app', view: 'superadmin-houses', focus: 'create-edit-deactivate' }
      },
      {
        id: 'role-management',
        title: 'Manage roles safely',
        description: 'Grant resident, house administrator and super administrator rights separately and cumulatively.',
        startTime: 80,
        duration: 28,
        caption: 'One identity may have several roles, while every permission remains clearly limited.',
        transcript: 'A personal identity may be a resident of one house, a house administrator and additionally a super administrator. Resident bookings remain assigned to the apartment, while administrative actions are logged personally. Grant only the permissions required for the specific responsibility.',
        scene: 'superadmin-role-management',
        visual: { kind: 'app', view: 'admin-roles', focus: 'cumulative-permissions' }
      },
      {
        id: 'superadmin-handover',
        title: 'Super administrator rights and handover',
        description: 'Grant or revoke super administrator rights and prepare succession safely.',
        startTime: 108,
        duration: 30,
        caption: 'Grant an active house administrator additional super administrator rights without losing your own automatically.',
        transcript: 'A super administrator can grant an active house administrator additional super administrator rights. The existing super administrator keeps their rights, preventing an unintended sole handover. Revocation or planned succession requires password confirmation, an audit trail and at least one remaining capable super administrator.',
        scene: 'superadmin-superadmin-handover',
        visual: { kind: 'app', view: 'system-responsibility', focus: 'grant-revoke-handover' }
      },
      {
        id: 'backup-external-storage',
        title: 'Backups and external storage',
        description: 'Monitor local backups, external copies and recoverability.',
        startTime: 138,
        duration: 30,
        caption: 'A backup is dependable only when a separate copy and a successful restore check exist.',
        transcript: 'In the System area, check the time, integrity and destination of database backups. A copy on the same server alone does not protect against a complete outage. Configure external storage and regularly verify that a backup can actually be restored.',
        scene: 'superadmin-backup-external-storage',
        visual: { kind: 'app', view: 'system-backup', focus: 'local-external-restore' }
      },
      {
        id: 'maintenance-mode',
        title: 'Control maintenance mode',
        description: 'Announce, protect and complete major changes in a controlled process.',
        startTime: 168,
        duration: 28,
        caption: 'Back up the data first, enable maintenance, then verify operation before reopening the app.',
        transcript: 'Use maintenance mode for major database or operational work. Inform residents, create a backup first and prevent new changes during the work. Afterwards, verify health status and core functions before restoring normal operation.',
        scene: 'superadmin-maintenance-mode',
        visual: { kind: 'app', view: 'system-maintenance', focus: 'enable-check-release' }
      },
      {
        id: 'pilot-reset',
        title: 'Reset pilot data carefully',
        description: 'Remove test bookings without accidentally losing accounts or evidence.',
        startTime: 196,
        duration: 28,
        caption: 'Use the pilot reset only after a backup, scope review and explicit approval.',
        transcript: 'The pilot reset is not a routine cleanup tool. Review exactly which bookings and test data will be removed, and create a backup immediately beforehand. Accounts, logbook evidence and production data must not accidentally become part of the reset.',
        scene: 'superadmin-pilot-reset',
        visual: { kind: 'app', view: 'system-pilot-reset', focus: 'scope-and-confirmation' }
      },
      {
        id: 'audit-system-status',
        title: 'Review audit and system status',
        description: 'Trace administrative actions, version, services and unusual events.',
        startTime: 224,
        duration: 28,
        caption: 'Use audit and system status to verify the actor, house, time and result.',
        transcript: 'The audit records who performed an administrative action, when it happened and which house it affected. System status adds the version, database, email, push, backup and maintenance state. Investigate and document unusual events instead of silently removing them from the history.',
        scene: 'superadmin-audit-system-status',
        visual: { kind: 'app', view: 'system-status', focus: 'audit-and-services' }
      },
      {
        id: 'critical-action-safety',
        title: 'Perform critical actions safely',
        description: 'Apply peer review thinking, password confirmation and follow-up checks.',
        startTime: 252,
        duration: 28,
        caption: 'Check the target, house, backup and recovery path before confirming a far-reaching action.',
        transcript: 'For role changes, house deactivation, maintenance and data resets, work deliberately. Verify the target, house, current backup, impact and recovery option. Confirm with your own current password, then review the audit and system status and document any remaining work.',
        scene: 'superadmin-critical-action-safety',
        visual: { kind: 'app', view: 'admin-confirmation', focus: 'preflight-and-verification' }
      }
    ]
  );

  const introductions = Object.freeze({
    resident: Object.freeze({ de: residentDe, en: residentEn }),
    house_admin: Object.freeze({ de: houseAdminDe, en: houseAdminEn }),
    superadmin: Object.freeze({ de: superadminDe, en: superadminEn })
  });

  global.WaschZeitIntroCatalog = Object.freeze({
    schemaVersion: 1,
    defaultLanguage: 'de',
    supportedLanguages: Object.freeze(['de', 'en']),
    supportedRoles: Object.freeze(['resident', 'house_admin', 'superadmin']),
    introductions,
    get(role, language) {
      const roleCatalog = introductions[role];
      if (!roleCatalog) {
        return null;
      }
      return roleCatalog[language] || roleCatalog.de || null;
    }
  });
})(window);
