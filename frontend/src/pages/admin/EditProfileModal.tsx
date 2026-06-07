// src/pages/admin/EditProfileModal.tsx
import React, { useState, useEffect, useRef } from "react";
import apiClient from "@/api/apiClient";
import { getImageUrl } from "@/utils/imageUrl";
import toast from "react-hot-toast";
import styles from "./EditProfileModal.module.css";

interface ProfileImage { id: number; url: string; order?: number; }

interface ProfileDetail {
  id: number;
  marca: string;
  modelo: string;
  categoria: string;
  traccion: string;
  potencia_hp: number | string;
  autonomia_km: number | string;
  capacidad_bateria_kwh: number | string;
  torque_nm: number | string;
  aceleracion_0_100: number | string;
  velocidad_maxima: number | string;
  numero_pasajeros: number | string;
  largo_mm: number | string;
  ancho_mm: number | string;
  alto_mm: number | string;
  distancia_ejes_mm: number | string;
  peso_kg: number | string;
  capacidad_maletero_l: number | string;
  colores_disponibles: string;
  seguridad: string;
  interior: string;
  exterior: string;
  tecnologia: string;
  imagenes?: ProfileImage[];
}

interface Props {
  profileId: number;
  onClose: () => void;
  onSaved: () => void;
}

export const EditProfileModal: React.FC<Props> = ({ profileId, onClose, onSaved }) => {
  const [data, setData] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.get(`/vehicle-profiles/${profileId}`)
      .then((res) => {
        // Normalizar arrays a strings para los textareas
        const d = res.data;
        setData({
          ...d,
          seguridad: Array.isArray(d.seguridad) ? d.seguridad.join(", ") : (d.seguridad ?? ""),
          interior:  Array.isArray(d.interior)  ? d.interior.join(", ")  : (d.interior ?? ""),
          exterior:  Array.isArray(d.exterior)  ? d.exterior.join(", ")  : (d.exterior ?? ""),
          tecnologia:Array.isArray(d.tecnologia) ? d.tecnologia.join(", "): (d.tecnologia ?? ""),
          colores_disponibles: Array.isArray(d.colores_disponibles)
            ? d.colores_disponibles.join(", ")
            : (d.colores_disponibles ?? ""),
        });
      })
      .catch(() => toast.error("No se pudo cargar el perfil."))
      .finally(() => setLoading(false));
  }, [profileId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setData((prev) => prev ? { ...prev, [e.target.name]: e.target.value } : prev);
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!window.confirm("¿Eliminar esta imagen?")) return;
    try {
      await apiClient.delete(`/vehicle-profiles/${profileId}/images/${imageId}`);
      setData((prev) => prev
        ? { ...prev, imagenes: prev.imagenes?.filter((img) => img.id !== imageId) }
        : prev
      );
      toast.success("Imagen eliminada.");
    } catch {
      toast.error("Error al eliminar imagen.");
    }
  };

  // Mover imagen: intercambia posición en el array local
  const moveImage = (index: number, direction: -1 | 1) => {
    setData((prev) => {
      if (!prev?.imagenes) return prev;
      const imgs = [...prev.imagenes];
      const target = index + direction;
      if (target < 0 || target >= imgs.length) return prev;
      [imgs[index], imgs[target]] = [imgs[target], imgs[index]];
      return { ...prev, imagenes: imgs };
    });
  };

  const handleUploadImages = async () => {
    if (!newFiles.length) return;
    const form = new FormData();
    newFiles.forEach((f) => form.append("files", f));
    setUploading(true);
    try {
      const res = await apiClient.post(`/vehicle-profiles/${profileId}/upload-images`, form);
      setData((prev) => prev
        ? { ...prev, imagenes: [...(prev.imagenes ?? []), ...res.data] }
        : prev
      );
      setNewFiles([]);
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Imágenes subidas correctamente.");
    } catch {
      toast.error("Error al subir imágenes.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await apiClient.patch(`/vehicle-profiles/${profileId}`, {
        marca: data.marca,
        modelo: data.modelo,
        categoria: data.categoria || null,
        traccion: data.traccion || null,
        potencia_hp:          Number(data.potencia_hp) || null,
        autonomia_km:         Number(data.autonomia_km) || null,
        capacidad_bateria_kwh:Number(data.capacidad_bateria_kwh) || null,
        torque_nm:            Number(data.torque_nm) || null,
        aceleracion_0_100:    Number(data.aceleracion_0_100) || null,
        velocidad_maxima:     Number(data.velocidad_maxima) || null,
        numero_pasajeros:     Number(data.numero_pasajeros) || null,
        largo_mm:             Number(data.largo_mm) || null,
        ancho_mm:             Number(data.ancho_mm) || null,
        alto_mm:              Number(data.alto_mm) || null,
        distancia_ejes_mm:    Number(data.distancia_ejes_mm) || null,
        peso_kg:              Number(data.peso_kg) || null,
        capacidad_maletero_l: Number(data.capacidad_maletero_l) || null,
        colores_disponibles: data.colores_disponibles,
        seguridad:  data.seguridad,
        interior:   data.interior,
        exterior:   data.exterior,
        tecnologia: data.tecnologia,
      });
      // Guardar orden de imágenes si hay más de una
      if (data.imagenes && data.imagenes.length > 1) {
        const imageOrder = data.imagenes.map((img, idx) => ({ id: img.id, order: idx }));
        await apiClient.patch(`/vehicle-profiles/${profileId}/images/reorder`, { images: imageOrder });
      }
      toast.success("Perfil actualizado.");
      onSaved();
      onClose();
    } catch {
      toast.error("Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className={styles.overlay}>
      <div className={styles.modal}><p>Cargando perfil...</p></div>
    </div>
  );
  if (!data) return null;

  

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Editar Perfil — {data.marca} {data.modelo}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* ── Identificación ── */}
          <section>
            <h3 className={styles.sectionTitle}>Identificación</h3>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label>Marca</label>
                <input name="marca" value={data.marca} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.field}>
                <label>Modelo</label>
                <input name="modelo" value={data.modelo} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.field}>
                <label>Categoría</label>
                <select name="categoria" value={data.categoria ?? ""} onChange={handleChange} className={styles.input}>
                  <option value="">-- Categoría --</option>
                  {["Sedan","SUV","Pickup","Hatchback","Comercial","Urbano"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Tracción</label>
                <select name="traccion" value={data.traccion ?? ""} onChange={handleChange} className={styles.input}>
                  <option value="">-- Tracción --</option>
                  {["4x2","4x4","AWD"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Pasajeros</label>
                <select name="numero_pasajeros" value={data.numero_pasajeros ?? ""} onChange={handleChange} className={styles.input}>
                  <option value="">--</option>
                  {[2,5,7].map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* ── Rendimiento ── */}
          <section>
            <h3 className={styles.sectionTitle}>⚡ Rendimiento</h3>
            <div className={styles.grid3}>
              {[
                { name: "potencia_hp",          label: "Potencia (HP)" },
                { name: "torque_nm",             label: "Torque (Nm)" },
                { name: "aceleracion_0_100",      label: "0-100 km/h (s)" },
                { name: "velocidad_maxima",       label: "Vel. Máx. (km/h)" },
                { name: "autonomia_km",           label: "Autonomía (km)" },
                { name: "capacidad_bateria_kwh",  label: "Batería (kWh)" },
              ].map(({ name, label }) => (
                <div key={name} className={styles.field}>
                  <label>{label}</label>
                  <input type="number" name={name}
                    value={(data as any)[name] ?? ""}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── Dimensiones ── */}
          <section>
            <h3 className={styles.sectionTitle}>📐 Dimensiones</h3>
            <div className={styles.grid3}>
              {[
                { name: "largo_mm",            label: "Largo (mm)" },
                { name: "ancho_mm",            label: "Ancho (mm)" },
                { name: "alto_mm",             label: "Alto (mm)" },
                { name: "distancia_ejes_mm",   label: "Dist. Ejes (mm)" },
                { name: "peso_kg",             label: "Peso (kg)" },
                { name: "capacidad_maletero_l", label: "Maletero (L)" },
              ].map(({ name, label }) => (
                <div key={name} className={styles.field}>
                  <label>{label}</label>
                  <input type="number" name={name}
                    value={(data as any)[name] ?? ""}
                    onChange={handleChange}
                    className={styles.input}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── Equipamiento ── */}
          <section>
            <h3 className={styles.sectionTitle}>🛡️ Equipamiento (separar por comas)</h3>
            <div className={styles.grid2}>
              {[
                { name: "colores_disponibles", label: "Colores disponibles" },
                { name: "seguridad",   label: "Seguridad" },
                { name: "interior",    label: "Interior" },
                { name: "exterior",    label: "Exterior" },
                { name: "tecnologia",  label: "Tecnología" },
              ].map(({ name, label }) => (
                <div key={name} className={`${styles.field} ${styles.fullWidth}`}>
                  <label>{label}</label>
                  <textarea name={name} rows={2}
                    value={(data as any)[name] ?? ""}
                    onChange={handleChange}
                    className={styles.textarea}
                    placeholder="Ej: Item 1, Item 2, Item 3"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── Imágenes ── */}
          <section>
            <h3 className={styles.sectionTitle}>🖼️ Imágenes del Modelo</h3>
            <p className={styles.imgHint}>
              La primera imagen es la miniatura principal. Usa ← → para reordenar. El orden se guarda al hacer clic en "Guardar cambios".
            </p>

            <div className={styles.imageGrid}>
              {(data.imagenes ?? []).map((img, idx, arr) => (
                <div key={img.id} className={`${styles.imgCard} ${idx === 0 ? styles.imgCardFirst : ""}`}>
                  {idx === 0 && <span className={styles.imgBadge}>★ Principal</span>}
                  <img src={getImageUrl(img.url)} alt={`Imagen ${idx + 1}`} className={styles.imgThumb} />

                  {/* Controles de reorden y borrado */}
                  <div className={styles.imgControls}>
                    <button
                      className={styles.imgArrow}
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      title="Mover a la izquierda"
                    >←</button>
                    <button
                      className={styles.imgDeleteSmall}
                      onClick={() => handleDeleteImage(img.id)}
                      title="Eliminar"
                    >✕</button>
                    <button
                      className={styles.imgArrow}
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === arr.length - 1}
                      title="Mover a la derecha"
                    >→</button>
                  </div>
                </div>
              ))}

              {/* Botón agregar */}
              <label className={styles.imgAddBtn}>
                <span>＋<br />Agregar</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => setNewFiles(e.target.files ? Array.from(e.target.files) : [])}
                />
              </label>
            </div>

            {newFiles.length > 0 && (
              <div className={styles.uploadPreview}>
                {newFiles.map((f, i) => (
                  <img key={i} src={URL.createObjectURL(f)} alt=""
                    style={{ width: 64, height: 52, objectFit: "cover", borderRadius: 6, border: "2px solid #024f7d" }}
                  />
                ))}
                <button
                  className={`${styles.uploadBtn} ${uploading ? styles.uploadBtnLoading : ""}`}
                  onClick={handleUploadImages}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className={styles.spinner} />
                      Subiendo {newFiles.length} imagen{newFiles.length > 1 ? "es" : ""}...
                    </>
                  ) : (
                    <>⬆️ Subir {newFiles.length} imagen{newFiles.length > 1 ? "es" : ""}</>
                  )}
                </button>
                {!uploading && (
                  <button className={styles.cancelSmall} onClick={() => setNewFiles([])}>Cancelar</button>
                )}
              </div>
            )}
            {uploading && (
              <div className={styles.uploadingBar}>
                <div className={styles.uploadingBarInner} />
                <span>Subiendo imágenes a la nube, por favor espera…</span>
              </div>
            )}
          </section>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "💾 Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
};
