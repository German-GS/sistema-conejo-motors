// frontend/src/components/UserForm/index.tsx
import React, { useState, useEffect } from "react";
import apiClient from "../../api/apiClient";
import styles from "./UserForm.module.css";
import toast from "react-hot-toast";
import { LuEye, LuEyeOff, LuCalculator } from "react-icons/lu";

interface Role {
  id: number;
  nombre: string;
}

interface UserFormProps {
  onSuccess: () => void;
  initialData?: any;
}

export const UserForm: React.FC<UserFormProps> = ({
  onSuccess,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    nombre_completo: "",
    email: "",
    cedula: "",
    contrasena: "",
    rol_id: "",
    salario_base: "",
    banco: "",
    numero_cuenta: "",
    puesto: "",
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isEditing = !!initialData;

  // Calculadora de salario bruto/neto
  const [modoSalario, setModoSalario] = useState<"bruto" | "neto">("bruto");
  const [calculando, setCalculando] = useState(false);
  const [calcResult, setCalcResult] = useState<{
    bruto: number; neto: number; totalDeducciones: number;
    desglose: { sem: number; ivm: number; bancoPopular: number; renta: number };
  } | null>(null);

  const fmtCRC = (v: number) =>
    new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(v);

  const handleCalcular = async () => {
    const monto = Number(formData.salario_base);
    if (!monto || monto <= 0) {
      toast.error("Ingresá primero un monto en el salario.");
      return;
    }
    setCalculando(true);
    try {
      const { data } = await apiClient.post("/recibos-pago/convertir-salario", {
        modo: modoSalario,
        monto,
      });
      setCalcResult(data);
      // Siempre se almacena el BRUTO (es lo que usa la planilla)
      setFormData((prev) => ({ ...prev, salario_base: String(data.bruto) }));
    } catch {
      toast.error("No se pudo calcular el salario.");
    } finally {
      setCalculando(false);
    }
  };

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await apiClient.get("/roles");
        setRoles(response.data);
        // Si estamos creando un usuario nuevo y hay roles, seleccionamos el primero por defecto
        if (response.data.length > 0 && !isEditing) {
          setFormData((prev) => ({
            ...prev,
            rol_id: response.data[0].id.toString(),
          }));
        }
      } catch (err) {
        console.error("Error al cargar roles", err);
      }
    };
    fetchRoles();
    // Se ha eliminado [isEditing] de las dependencias para que se ejecute siempre al montar.
  }, []);

  useEffect(() => {
    if (initialData) {
      // El salario más reciente es el último del array
      const ultimoSalario = initialData.salarios?.at(-1)?.salario_base || "";
      setFormData({
        nombre_completo: initialData.nombre_completo || "",
        email: initialData.email || "",
        cedula: initialData.cedula || "",
        rol_id: initialData.rol?.id?.toString() || "",
        contrasena: "",
        salario_base: ultimoSalario,
        banco: initialData.banco || "",
        numero_cuenta: initialData.numero_cuenta || "",
        puesto: initialData.puesto || "",
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Copiamos todo excepto la contraseña si está vacía
    const { contrasena, ...dataToSubmit } = formData;
    const finalData: any = { ...dataToSubmit };
    if (contrasena) {
      finalData.contrasena = contrasena;
    }

    try {
      if (isEditing) {
        await apiClient.patch(`/users/${initialData.id}`, finalData);
        toast.success("Colaborador actualizado con éxito.");
      } else {
        await apiClient.post("/users", finalData);
        toast.success("Colaborador creado con éxito.");
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Ocurrió un error.");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        name="nombre_completo"
        value={formData.nombre_completo}
        onChange={handleChange}
        placeholder="Nombre Completo"
        required
      />
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={handleChange}
        placeholder="Correo Electrónico"
        required
      />
      <input
        type="text"
        name="cedula"
        value={formData.cedula}
        onChange={handleChange}
        placeholder="Cédula"
        required={!isEditing}
      />
      <div className={styles.passwordWrapper}>
        <input
          type={showPassword ? "text" : "password"}
          name="contrasena"
          value={formData.contrasena}
          onChange={handleChange}
          placeholder={isEditing ? "Nueva Contraseña (opcional)" : "Contraseña"}
          className={styles.passwordInput}
          autoComplete="new-password"
          required={!isEditing}
        />
        <span
          className={styles.eyeBtn}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(v => !v); }}
          title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          role="button"
          tabIndex={-1}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
        </span>
      </div>
      <input
        type="number"
        name="salario_base"
        value={formData.salario_base}
        onChange={(e) => { handleChange(e); setCalcResult(null); }}
        placeholder="Salario Bruto Mensual (₡)"
        required={!isEditing}
      />
      <input
        type="text"
        name="puesto"
        value={formData.puesto}
        onChange={handleChange}
        placeholder="Puesto (ej: Gerente, Subgerente, Vendedor)"
      />
      <input
        type="text"
        name="banco"
        value={formData.banco}
        onChange={handleChange}
        placeholder="Banco"
      />
      <input
        type="text"
        name="numero_cuenta"
        value={formData.numero_cuenta}
        onChange={handleChange}
        placeholder="Número de Cuenta"
      />
      <select
        name="rol_id"
        value={formData.rol_id}
        onChange={handleChange}
        required
      >
        <option value="" disabled>
          Selecciona un rol...
        </option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.nombre}
          </option>
        ))}
      </select>
      {/* Calculadora de salario bruto/neto */}
      <div style={{ gridColumn: "1 / -1", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "0.85rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}><LuCalculator size={16} /> Calculadora de salario</span>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>El monto que escribí arriba es:</span>
          <div style={{ display: "inline-flex", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
            {(["bruto", "neto"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModoSalario(m); setCalcResult(null); }}
                style={{
                  border: "none", cursor: "pointer", padding: "0.35rem 0.85rem", fontSize: "0.82rem", fontWeight: 600,
                  background: modoSalario === m ? "#024f7d" : "#fff",
                  color: modoSalario === m ? "#fff" : "#475569",
                }}
              >
                {m === "bruto" ? "Bruto" : "Neto (lo que recibe)"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCalcular}
            disabled={calculando}
            style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "0.4rem 1rem", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}
          >
            {calculando ? "Calculando…" : "Calcular"}
          </button>
        </div>

        <p style={{ fontSize: "0.76rem", color: "#94a3b8", margin: "0.5rem 0 0" }}>
          Si prometés un <strong>neto</strong> al colaborador, elegí “Neto” y Calcular: el sistema sube el monto al bruto necesario (se guarda el bruto, que es lo que usa la planilla).
        </p>

        {calcResult && (
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.5rem 0.8rem", minWidth: 130 }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Salario Bruto</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--brand-dark)" }}>{fmtCRC(calcResult.bruto)}</div>
              <div style={{ fontSize: "0.68rem", color: "#16a34a" }}>✓ se guarda este</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.5rem 0.8rem", minWidth: 130 }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Neto que recibe</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#024f7d" }}>{fmtCRC(calcResult.neto)}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.5rem 0.8rem", minWidth: 130 }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>Deducciones CCSS</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#dc2626" }}>−{fmtCRC(calcResult.totalDeducciones)}</div>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                SEM {fmtCRC(calcResult.desglose.sem)} · IVM {fmtCRC(calcResult.desglose.ivm)} · BP {fmtCRC(calcResult.desglose.bancoPopular)}
                {calcResult.desglose.renta > 0 ? ` · Renta ${fmtCRC(calcResult.desglose.renta)}` : ""}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-principal"
        style={{ gridColumn: "1 / -1" }}
      >
        {isEditing ? "Actualizar Colaborador" : "Crear Colaborador"}
      </button>
      {error && <p style={{ color: "red", gridColumn: "1 / -1" }}>{error}</p>}
    </form>
  );
};
