const inviteCodePattern = /^EF[A-Z2-9]{6}$/i;

export const buildCheckInPayload = (value, sessionId) => {
  const identifier = value.trim();
  const payload = { sessionId: Number(sessionId) };
  if (inviteCodePattern.test(identifier)) {
    payload.inviteCode = identifier.toUpperCase();
  } else {
    payload.qrToken = identifier;
  }
  return payload;
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
