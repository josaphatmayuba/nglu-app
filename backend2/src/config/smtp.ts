import { env } from "./env";

export function smtpTransportOptions() {
  return {
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    tls: { rejectUnauthorized: env.smtp.tlsRejectUnauthorized },
  };
}
