function createMailTransport({ net, tls, env, enabled = false }) {
  const integrationEnabled = enabled === true;

  function disabledError() {
    const error = new Error('E-Mail ist durch EMAIL_ENABLED=false deaktiviert.');
    error.code = 'EMAIL_DISABLED';
    return error;
  }

  function emailStatus() {
    if (!integrationEnabled) {
      return {
        enabled: false,
        configured: false,
        label: 'deaktiviert'
      };
    }

    const host = String(env.SMTP_HOST || '').trim();
    const from = String(env.SMTP_FROM || '').trim();
    return {
      enabled: true,
      configured: Boolean(host && from),
      label: host && from ? 'bereit' : 'nicht konfiguriert'
    };
  }

  function smtpConfig() {
    if (!integrationEnabled) {
      return {
        enabled: false,
        host: '',
        port: 0,
        secure: false,
        user: '',
        password: '',
        from: ''
      };
    }

    const secure = String(env.SMTP_SECURE || '').toLowerCase() === 'true';
    return {
      enabled: true,
      host: String(env.SMTP_HOST || '').trim(),
      port: Number(env.SMTP_PORT || (secure ? 465 : 587)),
      secure,
      user: String(env.SMTP_USER || '').trim(),
      password: String(env.SMTP_PASSWORD || ''),
      from: String(env.SMTP_FROM || env.SMTP_USER || '').trim()
    };
  }

  function extractEmailAddress(value) {
    const safeValue = sanitizeMailHeader(value);
    const match = safeValue.match(/<([^>]+)>/);
    return (match ? match[1] : safeValue).trim();
  }

  function sanitizeMailHeader(value) {
    return String(value || '').replace(/[\r\n]+/g, ' ').trim();
  }

  function normalizeMailText(value) {
    return String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n/g, '\r\n');
  }

  function mailHeaders({ config, to, subject, text }) {
    const safeFrom = sanitizeMailHeader(config.from);
    const from = safeFrom.includes('<') ? safeFrom : `WaschZeit <${safeFrom}>`;
    return [
      `From: ${from}`,
      `To: ${sanitizeMailHeader(to)}`,
      `Subject: ${sanitizeMailHeader(subject)}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      `Date: ${new Date().toUTCString()}`,
      '',
      normalizeMailText(text)
    ].join('\r\n');
  }

  async function sendMail({ config, to, subject, text }) {
    if (!integrationEnabled) {
      throw disabledError();
    }

    let socket = await openSmtpSocket(config, config.secure);
    let session = smtpSession(socket);

    await session.expect([220]);
    let ehlo = await session.command(`EHLO ${env.SMTP_HELO_NAME || 'waschplan.local'}`, [250]);

    if (!config.secure && ehlo.text.includes('STARTTLS')) {
      await session.command('STARTTLS', [220]);
      session.closeListeners();
      socket = await upgradeSmtpSocket(socket, config);
      session = smtpSession(socket);
      await session.command(`EHLO ${env.SMTP_HELO_NAME || 'waschplan.local'}`, [250]);
    }

    if (config.user && config.password) {
      await session.command('AUTH LOGIN', [334]);
      await session.command(Buffer.from(config.user).toString('base64'), [334]);
      await session.command(Buffer.from(config.password).toString('base64'), [235]);
    }

    await session.command(`MAIL FROM:<${extractEmailAddress(config.from)}>`, [250]);
    await session.command(`RCPT TO:<${extractEmailAddress(to)}>`, [250, 251]);
    await session.command('DATA', [354]);
    socket.write(`${mailHeaders({ config, to, subject, text }).replace(/(^|\r\n)\./g, '$1..')}\r\n.\r\n`);
    await session.expect([250]);
    await session.command('QUIT', [221]);
    session.closeListeners();
    socket.end();
  }

  function openSmtpSocket(config, secure) {
    return new Promise((resolve, reject) => {
      const options = {
        host: config.host,
        port: config.port,
        servername: config.host
      };
      const socket = secure ? tls.connect(options, () => resolve(socket)) : net.connect(options, () => resolve(socket));
      socket.setEncoding('utf8');
      socket.setTimeout(15000, () => {
        socket.destroy(new Error('SMTP timeout'));
      });
      socket.once('error', reject);
    });
  }

  function upgradeSmtpSocket(socket, config) {
    return new Promise((resolve, reject) => {
      const secureSocket = tls.connect({
        socket,
        servername: config.host
      }, () => {
        secureSocket.setEncoding('utf8');
        secureSocket.setTimeout(15000, () => {
          secureSocket.destroy(new Error('SMTP timeout'));
        });
        resolve(secureSocket);
      });
      secureSocket.once('error', reject);
    });
  }

  function smtpSession(socket) {
    let buffer = '';
    const waiters = [];

    function onData(chunk) {
      buffer += chunk;
      flush();
    }

    function onError(error) {
      while (waiters.length) {
        waiters.shift().reject(error);
      }
    }

    function flush() {
      if (!waiters.length) {
        return;
      }

      const match = buffer.match(/(?:^|\r?\n)(\d{3}) [^\r\n]*(?:\r?\n|$)/);
      if (!match) {
        return;
      }

      const endIndex = buffer.indexOf(match[0]) + match[0].length;
      const text = buffer.slice(0, endIndex);
      buffer = buffer.slice(endIndex);
      waiters.shift().resolve({ code: Number(match[1]), text });
    }

    socket.on('data', onData);
    socket.on('error', onError);

    return {
      expect(expectedCodes) {
        return new Promise((resolve, reject) => {
          waiters.push({
            resolve: (response) => {
              if (!expectedCodes.includes(response.code)) {
                reject(new Error(`SMTP expected ${expectedCodes.join('/')} but got ${response.code}: ${response.text.trim()}`));
                return;
              }
              resolve(response);
            },
            reject
          });
          flush();
        });
      },
      command(command, expectedCodes) {
        socket.write(`${command}\r\n`);
        return this.expect(expectedCodes);
      },
      closeListeners() {
        socket.off('data', onData);
        socket.off('error', onError);
      }
    };
  }

  return { emailStatus, smtpConfig, extractEmailAddress, sendMail };
}

module.exports = { createMailTransport };
