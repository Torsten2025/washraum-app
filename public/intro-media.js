(function exposeWaschZeitIntroMedia(global) {
  'use strict';

  const catalog = global.WaschZeitIntroCatalog;
  if (!catalog) throw new Error('WaschZeitIntroCatalog must be loaded before intro-media.js');

  const roles = ['resident', 'house_admin', 'superadmin'];
  const languages = ['de', 'en'];
  const roleLabels = {
    resident: { de: 'Bewohner', en: 'Resident' },
    house_admin: { de: 'Haus-Admin', en: 'House administrator' },
    superadmin: { de: 'Superadmin', en: 'Super administrator' }
  };

  const packages = roles.flatMap((role) => languages.map((language) => {
    const introduction = catalog.get(role, language);
    const id = `${role.replace('_', '-')}-${language}`;
    const basePath = `/assets/intro/media/${id}`;
    return Object.freeze({
      id,
      role,
      roleLabel: roleLabels[role][language],
      language,
      languageLabel: language === 'en' ? 'English' : 'Deutsch',
      title: introduction.title,
      description: introduction.description,
      duration: introduction.totalDuration,
      width: 1280,
      height: 720,
      videoCodec: 'H.264',
      audioCodec: 'AAC',
      video: `${basePath}.mp4`,
      captions: `${basePath}.vtt`,
      poster: `${basePath}-poster.png`,
      transcript: `${basePath}.txt`,
      chapters: introduction.chapters
    });
  }));

  const byId = new Map(packages.map((item) => [item.id, item]));

  global.WaschZeitIntroMedia = Object.freeze({
    version: 'media-v1',
    packages: Object.freeze(packages),
    get(role, language) {
      const safeRole = roles.includes(role) ? role : 'resident';
      const safeLanguage = languages.includes(language) ? language : 'de';
      return byId.get(`${safeRole.replace('_', '-')}-${safeLanguage}`);
    }
  });
})(window);
