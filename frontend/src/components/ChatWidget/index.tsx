import { useState, useEffect, useRef, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import apiClient from "@/api/apiClient";
import styles from "./ChatWidget.module.css";

interface Mensaje {
  id: number;
  contenido: string;
  fecha_hora: string;
  remitente: {
    id: number;
    nombre_completo: string;
    rol?: { nombre: string };
    puesto?: string;
  };
}

const STORAGE_KEY = "chat_last_seen_id";

const getLastSeen = (): number =>
  parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10) || 0;

const setLastSeen = (id: number) =>
  localStorage.setItem(STORAGE_KEY, String(id));

const AVATAR_COLORS = [
  "#024f7d","#0891b2","#059669","#7c3aed","#db2777","#d97706","#dc2626",
];
const avatarColor = (name: string) =>
  AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
const initials = (name: string) =>
  (name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });

// Obtener myId desde el token (estable, calculado una vez)
const getMyId = (): number => {
  try {
    const tok = localStorage.getItem("accessToken");
    if (!tok) return 0;
    return (jwtDecode<{ sub: number }>(tok)).sub ?? 0;
  } catch { return 0; }
};

export const ChatWidget: React.FC = () => {
  const [open, setOpen]         = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto]       = useState("");
  const [sending, setSending]   = useState(false);
  const [unread, setUnread]     = useState(0);

  const lastIdRef   = useRef(0);   // ID del último mensaje cargado (para polling)
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const myId        = useRef(getMyId()).current;

  // ── Carga inicial ─────────────────────────────────────────────────────────
  const cargarRecientes = useCallback(async () => {
    try {
      const res = await apiClient.get("/chat?limit=60");
      const msgs: Mensaje[] = Array.isArray(res.data) ? res.data : [];
      setMensajes(msgs);

      if (msgs.length) {
        const maxId = msgs[msgs.length - 1].id;
        lastIdRef.current = maxId;

        // Calcular no leídos: mensajes de OTROS que son más nuevos que el último visto
        const lastSeen = getLastSeen();
        const noLeidos = msgs.filter(
          (m) => m.id > lastSeen && m.remitente.id !== myId
        ).length;
        setUnread(noLeidos);
      }
    } catch { /* silencioso */ }
  }, [myId]);

  // ── Polling de mensajes nuevos ────────────────────────────────────────────
  const poll = useCallback(async () => {
    try {
      const res = await apiClient.get(`/chat/poll?sinceId=${lastIdRef.current}`);
      const nuevos: Mensaje[] = Array.isArray(res.data) ? res.data : [];
      if (!nuevos.length) return;

      setMensajes((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        return [...prev, ...nuevos.filter((m) => !ids.has(m.id))];
      });
      lastIdRef.current = nuevos[nuevos.length - 1].id;

      // Solo incrementar no leídos si el panel está CERRADO y son de otros
      if (!open) {
        const deOtros = nuevos.filter((m) => m.remitente.id !== myId).length;
        if (deOtros > 0) setUnread((u) => u + deOtros);
      }
    } catch { /* silencioso */ }
  }, [open, myId]);

  useEffect(() => { cargarRecientes(); }, [cargarRecientes]);

  useEffect(() => {
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  // ── Abrir / Cerrar ────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      // Marcar como vistos
      setUnread(0);
      if (lastIdRef.current > 0) setLastSeen(lastIdRef.current);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        inputRef.current?.focus();
      }, 80);
    }
  }, [open]);

  // Scroll al fondo al recibir mensajes mientras está abierto
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, open]);

  // ── Enviar ────────────────────────────────────────────────────────────────
  const enviar = async () => {
    const msg = texto.trim();
    if (!msg || sending) return;
    setSending(true);
    setTexto("");
    try {
      const res = await apiClient.post("/chat", { contenido: msg });
      setMensajes((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        if (ids.has(res.data.id)) return prev;
        return [...prev, res.data];
      });
      lastIdRef.current = res.data.id;
      setLastSeen(res.data.id);
    } catch { /* silencioso */ }
    finally { setSending(false); }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Botón flotante */}
      <button
        className={`${styles.fab} ${unread > 0 ? styles.fabPulse : ""}`}
        onClick={() => setOpen((o) => !o)}
        title="Chat del equipo"
      >
        <span className={styles.fabIcon}>💬</span>
        {unread > 0 && (
          <span className={styles.fabBadge}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.headerTitle}>💬 Chat del Equipo</span>
              <span className={styles.onlineDot} />
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className={styles.messages}>
            {mensajes.length === 0 && (
              <div className={styles.empty}>No hay mensajes aún.<br />¡Sé el primero en escribir! 👋</div>
            )}
            {mensajes.map((m, i) => {
              const esPropio = m.remitente.id === myId;
              const prev = mensajes[i - 1];
              const mismoRemitente = prev?.remitente.id === m.remitente.id;
              const showDate = !prev || new Date(prev.fecha_hora).toDateString() !== new Date(m.fecha_hora).toDateString();

              return (
                <div key={m.id}>
                  {showDate && (
                    <div className={styles.dateDivider}>
                      {new Date(m.fecha_hora).toLocaleDateString("es-CR", {
                        weekday: "short", day: "numeric", month: "short",
                      })}
                    </div>
                  )}
                  <div className={`${styles.msgRow} ${esPropio ? styles.own : ""}`}>
                    {!esPropio && !mismoRemitente && (
                      <div className={styles.avatar} style={{ background: avatarColor(m.remitente.nombre_completo) }}>
                        {initials(m.remitente.nombre_completo)}
                      </div>
                    )}
                    {!esPropio && mismoRemitente && <div className={styles.avatarSpacer} />}
                    <div className={styles.bubble}>
                      {!esPropio && !mismoRemitente && (
                        <span className={styles.senderName}>
                          {m.remitente.nombre_completo.split(" ")[0]}
                          {m.remitente.puesto ? (
                            <span className={styles.rolBadge}>{m.remitente.puesto}</span>
                          ) : m.remitente.rol?.nombre === "Administrador" ? (
                            <span className={styles.rolBadge}>Admin</span>
                          ) : null}
                        </span>
                      )}
                      <p className={styles.msgText}>{m.contenido}</p>
                      <span className={styles.msgTime}>{fmtHora(m.fecha_hora)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={onKey}
              placeholder="Escribe un mensaje... (Enter para enviar)"
              maxLength={500}
              disabled={sending}
            />
            <button
              className={styles.sendBtn}
              onClick={enviar}
              disabled={!texto.trim() || sending}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};
