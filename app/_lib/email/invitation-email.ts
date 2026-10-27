export type InvitationEmailInput = {
  parentFullName: string;
  childFullName: string;
  childFirstName: string;
  roomName: string;
  code: string;
  activationUrl: string;
};

const BRAND = "OpenDayCare";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildInvitationEmailSubject(
  input: Pick<InvitationEmailInput, "childFirstName">,
): string {
  return `Invitación para seguir a ${input.childFirstName} en ${BRAND}`;
}

export function buildInvitationEmailHtml(
  input: InvitationEmailInput,
): string {
  const parent = escapeHtml(input.parentFullName);
  const child = escapeHtml(input.childFullName);
  const room = escapeHtml(input.roomName);
  const code = escapeHtml(input.code);
  const url = escapeHtml(input.activationUrl);
  const roomLabel = input.roomName === "" ? "" : ` · ${room}`;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${BRAND}</title>
  </head>
  <body style="margin:0;padding:0;background:#F6ECDF;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6ECDF;padding:28px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFDF9;border:1px solid #ECE0D0;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:26px 28px 0 28px;">
                <div style="font-family:${SERIF};font-size:20px;font-weight:bold;color:#3F362E;letter-spacing:.2px;">${BRAND}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 0 28px;">
                <h1 style="margin:0;font-family:${SERIF};font-size:24px;line-height:1.25;color:#3F362E;">Hola, ${parent}</h1>
                <p style="margin:12px 0 0 0;font-family:${SANS};font-size:15px;line-height:1.55;color:#6E6359;">
                  La guardería te invitó a seguir el día de
                  <strong style="color:#3F362E;">${child}</strong>${roomLabel}.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 0 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF1D6;border:1px dashed #E6D08A;border-radius:16px;">
                  <tr>
                    <td align="center" style="padding:18px 16px;">
                      <div style="font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:.8px;color:#A88526;">CÓDIGO DE INVITACIÓN</div>
                      <div style="margin-top:8px;font-family:${SERIF};font-size:32px;font-weight:bold;letter-spacing:7px;color:#8A7234;">${code}</div>
                      <div style="margin-top:6px;font-family:${SANS};font-size:13px;color:#A88526;">El código vence en 7 días</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 0 28px;">
                <a href="${url}" style="display:block;padding:15px 20px;border-radius:14px;background:#EE8164;color:#FFFFFF;font-family:${SANS};font-size:15.5px;font-weight:bold;text-align:center;text-decoration:none;">
                  Activar mi cuenta
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 0 28px;">
                <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.5;color:#94887B;">
                  Si el botón no abre, copiá este enlace en tu navegador:<br />
                  <a href="${url}" style="color:#EE8164;word-break:break-all;">${url}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px 26px 28px;">
                <p style="margin:0;font-family:${SANS};font-size:12.5px;line-height:1.5;color:#A89A8B;">
                  Si no esperabas esta invitación, podés ignorar este correo.
                </p>
              </td>
            </tr>
          </table>
          <div style="margin-top:16px;font-family:${SANS};font-size:11.5px;color:#A89A8B;">
            ${BRAND}
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
