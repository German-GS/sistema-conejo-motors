import { createContext, useContext, useState, useCallback, useRef } from "react";
import styles from "./ConfirmDialog.module.css";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

// Hook imperativo: const confirm = useConfirm(); if (await confirm({...})) { ... }
export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setState(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className={styles.overlay} onClick={() => close(false)}>
          <div className={styles.box} onClick={(e) => e.stopPropagation()}>
            <div className={styles.body}>
              <span className={styles.icon}>{state.danger ? "⚠️" : "❓"}</span>
              <div>
                <h3 className={styles.title}>{state.title ?? "Confirmar acción"}</h3>
                <p className={styles.message}>{state.message}</p>
              </div>
            </div>
            <div className={styles.actions}>
              <button className={`${styles.btn} ${styles.cancel}`} onClick={() => close(false)}>
                {state.cancelText ?? "Cancelar"}
              </button>
              <button
                className={`${styles.btn} ${state.danger ? styles.danger : styles.confirm}`}
                onClick={() => close(true)}
                autoFocus
              >
                {state.confirmText ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
