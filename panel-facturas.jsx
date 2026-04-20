import { useState, useRef, useCallback, useEffect } from "react";
import html2pdf from "html2pdf.js";

// ─── Data defaults ──────────────────────────────────────
const INITIAL_COMPANY = {
  nombre: "JHONNY SANDRO CLAROS SANJINES",
  dni: "43454553L",
  direccion: "CALLE ARAGÓN Nº 40 1º",
  codigoPostal: "07006",
  telefono: "694393923",
  ciudad: "PALMA DE MALLORCA",
  cuentaBanco: "Cuenta Banco Caixa ES22 2222 2222 2222",
  notaPorDefecto: "",
  gmailUser: "",
  gmailAppPassword: "",
};

const CATEGORIAS_CATALOGO = [
  "Albañilería",
  "Fontanería",
  "Electricidad",
  "Pintura",
  "Revestimientos",
  "Demolición",
  "Carpintería",
  "Instalaciones",
  "Saneamiento",
  "Impermeabilización",
  "Mano de obra",
  "Materiales",
  "Desplazamiento",
  "Otros",
];

// Algunas partidas de ejemplo para que no empiece vacío
const CATALOGO_INICIAL = [
  { id: 1, codigo: "ALB-001", categoria: "Albañilería", descripcion: "Embaldosado de suelo con baldosa cerámica", unidad: "m²", precio: 28 },
  { id: 2, codigo: "ALB-002", categoria: "Albañilería", descripcion: "Enfoscado de paredes con mortero de cemento", unidad: "m²", precio: 18 },
  { id: 3, codigo: "ALB-003", categoria: "Albañilería", descripcion: "Construcción de tabique de ladrillo", unidad: "m²", precio: 32 },
  { id: 4, codigo: "FON-001", categoria: "Fontanería", descripcion: "Sustitución de termo eléctrico", unidad: "ud", precio: 193.18 },
  { id: 5, codigo: "FON-002", categoria: "Fontanería", descripcion: "Instalación de grifería monomando", unidad: "ud", precio: 85 },
  { id: 6, codigo: "SAN-001", categoria: "Saneamiento", descripcion: "Cambio de tubería PVC 125mm", unidad: "ml", precio: 35 },
  { id: 7, codigo: "SAN-002", categoria: "Saneamiento", descripcion: "Construcción de arqueta de registro", unidad: "ud", precio: 180 },
  { id: 8, codigo: "DEM-001", categoria: "Demolición", descripcion: "Demolición de solera de hormigón", unidad: "m²", precio: 15 },
  { id: 9, codigo: "DEM-002", categoria: "Demolición", descripcion: "Embolsado de escombros y retirada a vertedero", unidad: "ud", precio: 100 },
  { id: 10, codigo: "REV-001", categoria: "Revestimientos", descripcion: "Alicatado de paredes con azulejo cerámico", unidad: "m²", precio: 32 },
  { id: 11, codigo: "MO-001", categoria: "Mano de obra", descripcion: "Mano de obra oficial de primera", unidad: "h", precio: 25 },
  { id: 12, codigo: "MO-002", categoria: "Mano de obra", descripcion: "Desplazamiento", unidad: "ud", precio: 30 },
];

let _uid = 1;
const uid = () => _uid++;

const newItem = () => ({
  id: uid(),
  descripcion: "",
  ud: "ud",
  pu: 0,
  cantidad: 1,
  tieneImporte: true,
});

const newSection = () => ({
  id: uid(),
  titulo: "",
  mostrarTotal: false,
  totalSeccion: null,
  items: [newItem()],
});

const emptyDoc = (tipo, notaPorDefecto) => ({
  tipo,
  numero: "",
  fecha: new Date().toISOString().split("T")[0],
  cliente: { nombre: "", nie: "", direccion: "" },
  direccionObra: "",
  secciones: [newSection()],
  iva: tipo === "factura" ? 21 : 10,
  notas: notaPorDefecto || "",
  totalManual: null,
});

const fmt = (n) =>
  n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toRoman = (n) => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n] || n + 1;

// ─── PDF Download & Generate ────────────────────────────
function useDownloadPdf () {
  const ref = useRef(null);

  const pdfOpts = {
    margin: [10, 10, 10, 10],
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  const download = useCallback((filename) => {
    if (!ref.current) return;
    html2pdf().set({ ...pdfOpts, filename: filename || "documento.pdf" }).from(ref.current).save();
  }, []);

  const toBase64 = useCallback(async () => {
    if (!ref.current) return null;
    const worker = html2pdf().set(pdfOpts).from(ref.current);
    const pdf = await worker.outputPdf("arraybuffer");
    const bytes = new Uint8Array(pdf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }, []);

  return { ref, download, toBase64 };
}

// ─── Sidebar ────────────────────────────────────────────
function Sidebar ({ view, setView, counts }) {
  const items = [
    { id: "dashboard", label: "Panel", icon: "🐈" },
    { id: "nueva-factura", label: "Nueva Factura", icon: "📋" },
    { id: "nuevo-presupuesto", label: "Nuevo Presupuesto", icon: "📋" },
    { id: "clientes", label: "Clientes", icon: "👥" },
    { id: "catalogo", label: "Catálogo Precios", icon: "📖" },
    { id: "historial", label: "Historial", icon: "🙈" },
    { id: "resumen", label: "Resumen Financiero", icon: "📊" },
    { id: "config", label: "Configuración", icon: "🍞 " },
  ];
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>LISA</h1>
        <p>tu ayudante y amiga</p>
      </div>
      <nav className="sidebar-nav">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            className={`sidebar-btn ${view === it.id ? "active" : ""}`}
          >
            <span className="icon">{it.icon}</span>
            {it.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        Facturas: {counts.facturas} · Presupuestos: {counts.presupuestos}
      </div>
    </div>
  );
}

// ─── Autocomplete search for catalog ────────────────────
function CatalogSearch ({ catalogo, onSelect, value, onChange }) {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const results = query.length >= 2
    ? catalogo.filter((p) =>
      p.descripcion.toLowerCase().includes(query.toLowerCase()) ||
      p.categoria.toLowerCase().includes(query.toLowerCase()) ||
      p.codigo.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8)
    : [];

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
  };

  const handleSelect = (item) => {
    onSelect(item);
    setQuery("");
    setFocused(false);
  };

  return (
    <div className="catalog-search" ref={wrapperRef}>
      <input
        className="form-input item-desc-input"
        placeholder="Buscar en catálogo o escribir descripción..."
        value={value}
        onChange={handleInput}
        onFocus={() => { setFocused(true); setQuery(value); }}
      />
      {focused && results.length > 0 && (
        <div className="catalog-dropdown">
          {results.map((r) => (
            <button key={r.id} className="catalog-dropdown-item" onClick={() => handleSelect(r)}>
              <div className="catalog-dropdown-main">
                <span className="catalog-dropdown-cat">{r.categoria}</span>
                <span className="catalog-dropdown-desc">{r.descripcion}</span>
              </div>
              <div className="catalog-dropdown-price">
                {fmt(r.precio)} €/{r.unidad}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section Editor ─────────────────────────────────────
function SectionEditor ({ seccion, secIdx, onUpdate, onRemove, catalogo }) {
  const updateField = (field, val) => onUpdate({ ...seccion, [field]: val });

  const updateItem = (itemIdx, field, val) => {
    const items = [...seccion.items];
    items[itemIdx] = { ...items[itemIdx], [field]: val };
    onUpdate({ ...seccion, items });
  };

  const applyFromCatalog = (itemIdx, catalogItem) => {
    const items = [...seccion.items];
    items[itemIdx] = {
      ...items[itemIdx],
      descripcion: catalogItem.descripcion,
      ud: catalogItem.unidad,
      pu: catalogItem.precio,
      tieneImporte: true,
    };
    onUpdate({ ...seccion, items });
  };

  const addItem = () => onUpdate({ ...seccion, items: [...seccion.items, newItem()] });
  const removeItem = (itemIdx) => onUpdate({ ...seccion, items: seccion.items.filter((_, i) => i !== itemIdx) });

  return (
    <div className="section-editor">
      <div className="section-editor-header">
        <div className="section-number">{toRoman(secIdx)}</div>
        <input
          className="form-input section-title-input"
          placeholder="Título de la sección (ej: SUMINISTRO E INSTALACIÓN)"
          value={seccion.titulo}
          onChange={(e) => updateField("titulo", e.target.value)}
        />
        <button className="btn-remove-section" onClick={onRemove} title="Eliminar sección">×</button>
      </div>
      <div className="section-items">
        {seccion.items.map((item, iIdx) => (
          <div key={item.id} className="item-row">
            <div className="item-row-top">
              <span className="item-number">{iIdx + 1}</span>
              <CatalogSearch
                catalogo={catalogo}
                value={item.descripcion}
                onChange={(val) => updateItem(iIdx, "descripcion", val)}
                onSelect={(cat) => applyFromCatalog(iIdx, cat)}
              />
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={item.tieneImporte}
                  onChange={(e) => updateItem(iIdx, "tieneImporte", e.target.checked)}
                />
                <span className="toggle-text">Con precio</span>
              </label>
              <button className="btn-remove-line" onClick={() => removeItem(iIdx)} title="Eliminar">×</button>
            </div>
            {item.tieneImporte && (
              <div className="item-row-prices">
                <div>
                  <label className="form-label">Ud</label>
                  <input className="form-input small-input" value={item.ud} onChange={(e) => updateItem(iIdx, "ud", e.target.value)} />
                </div>
                <div>
                  <label className="form-label">P.U (€)</label>
                  <input type="number" min="0" step="0.01" className="form-input small-input" value={item.pu} onChange={(e) => updateItem(iIdx, "pu", parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="form-label">Cantidad</label>
                  <input type="number" min="0" className="form-input small-input" value={item.cantidad} onChange={(e) => updateItem(iIdx, "cantidad", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="item-importe">
                  <label className="form-label">Importe</label>
                  <span>{fmt(item.pu * item.cantidad)} €</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={addItem} className="btn-add-line">+ Añadir concepto</button>

      {/* Section total */}
      <div className="section-total-bar">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={!!seccion.mostrarTotal}
            onChange={(e) => updateField("mostrarTotal", e.target.checked)}
          />
          <span className="toggle-text">Mostrar total de sección</span>
        </label>
        {seccion.mostrarTotal && (
          <div className="section-total-input-group">
            <label className="form-label">Total sección (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input small-input"
              placeholder={fmt(seccion.items.reduce((s, it) => s + (it.tieneImporte ? it.pu * it.cantidad : 0), 0))}
              value={seccion.totalSeccion ?? ""}
              onChange={(e) => updateField("totalSeccion", e.target.value === "" ? null : parseFloat(e.target.value) || 0)}
            />
          </div>
        )}
        <span className="section-total-value">
          Auto: {fmt(seccion.items.reduce((s, it) => s + (it.tieneImporte ? it.pu * it.cantidad : 0), 0))} €
        </span>
      </div>
    </div>
  );
}

// ─── Document Preview (matches PDF format) ──────────────
function DocPreview ({ doc, company, pdfRef }) {
  const titulo = doc.tipo === "factura" ? "FACTURA" : "PRESUPUESTO";

  let globalItemNum = 0;
  const sectionData = doc.secciones.map((sec) => {
    const autoTotal = sec.items.reduce((s, it) => s + (it.tieneImporte ? it.pu * it.cantidad : 0), 0);
    const total = (sec.mostrarTotal && sec.totalSeccion != null) ? sec.totalSeccion : autoTotal;
    const items = sec.items.map((it) => {
      globalItemNum++;
      return { ...it, globalNum: globalItemNum };
    });
    return { ...sec, items, total };
  });

  const autoSubtotal = sectionData.reduce((s, sec) => s + sec.total, 0);
  const hasManualTotal = doc.totalManual != null && doc.totalManual !== "";
  const total = hasManualTotal ? (parseFloat(doc.totalManual) || 0) : autoSubtotal * (1 + doc.iva / 100);
  const subtotal = hasManualTotal ? total / (1 + doc.iva / 100) : autoSubtotal;
  const ivaAmt = total - subtotal;

  return (
    <div className="doc-preview" ref={pdfRef}>

      <div className="doc-company-header">
        <div className="doc-company-logo">
          <div className="doc-company-name">{company.nombre}</div>
          <div className="doc-company-detail">DNI: {company.dni}</div>
          <div className="doc-company-detail">CALLE: {company.direccion}</div>
          <div className="doc-company-detail">CÓDIGO POSTAL: {company.codigoPostal}</div>
          <div className="doc-company-detail">TELÉFONO: {company.telefono}</div>
          <div className="doc-company-detail">{company.ciudad}</div>
        </div>
        <div className="doc-title-block">
          <h1 className="doc-title">{titulo} {doc.numero}</h1>
        </div>
      </div>

      <div className="doc-fecha">Fecha: {doc.fecha.split("-").reverse().join("/")}</div>

      <div className="doc-client-info">
        <div><strong>CLIENTE:</strong> {doc.cliente.nombre || "—"}</div>
        <div><strong>NIE/NIF/CIF:</strong> {doc.cliente.nie}</div>
        <div><strong>DIRECCIÓN:</strong> {doc.cliente.direccion}</div>
      </div>

      <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", marginBottom: "2rem", fontSize: "0.8rem" }}>
        <thead>
          <tr>
            <th style={{ width: "5%", backgroundColor: "#f0f0f0", border: "1px solid #999", padding: "0.6rem 0.5rem", fontWeight: 700, fontSize: "0.75rem", textAlign: "center" }}>Nº</th>
            <th style={{ width: "5%", backgroundColor: "#f0f0f0", border: "1px solid #999", padding: "0.6rem 0.5rem", fontWeight: 700, fontSize: "0.75rem", textAlign: "center" }}>UD</th>
            <th style={{ width: "35%", backgroundColor: "#f0f0f0", border: "1px solid #999", padding: "0.6rem 0.5rem", fontWeight: 700, fontSize: "0.75rem", textAlign: "center" }}>DESCRIPCIÓN</th>
            <th style={{ width: "15%", backgroundColor: "#f0f0f0", border: "1px solid #999", padding: "0.6rem 0.5rem", fontWeight: 700, fontSize: "0.75rem", textAlign: "center" }}>P.U (€)</th>
            <th style={{ width: "15%", backgroundColor: "#f0f0f0", border: "1px solid #999", padding: "0.6rem 0.5rem", fontWeight: 700, fontSize: "0.75rem", textAlign: "center" }}>CANTIDAD</th>
            <th style={{ width: "25%", backgroundColor: "#f0f0f0", border: "1px solid #999", padding: "0.6rem 0.5rem", fontWeight: 700, fontSize: "0.75rem", textAlign: "center" }}>IMPORTE (€)</th>
          </tr>
        </thead>
        {(() => {
          const S = {
            cell: { border: "1px solid #bbb", padding: "0.6rem 0.5rem", verticalAlign: "top", wordWrap: "break-word" },
            num: { textAlign: "center" },
            ud: { textAlign: "center" },
            desc: { textAlign: "left" },
            pu: { textAlign: "right", paddingRight: "0.75rem" },
            cant: { textAlign: "center" },
            imp: { textAlign: "right", paddingRight: "0.75rem" },
            bold: { fontWeight: 700 },
            extraBold: { fontWeight: 900 },
            secBg: { backgroundColor: "#d1d9e1" },
            secTotalBg: { backgroundColor: "#e8ecf0", borderTop: "1.5px solid #999" },
            subBorder: { borderTop: "2px solid #999", borderLeft: "none", borderRight: "none", paddingTop: "0.75rem" },
            ivaBorder: { borderLeft: "none", borderRight: "none" },
            totalBorder: { borderTop: "2px solid #333", borderLeft: "none", borderRight: "none", paddingTop: "0.75rem", fontWeight: 700, fontSize: "0.85rem" },
          };
          const c = (...styles) => Object.assign({}, S.cell, ...styles);

          return (
            <tbody>
              {doc.direccionObra && (
                <tr>
                  <td colSpan="6" style={{ ...S.cell, borderLeft: "none", borderRight: "none", backgroundColor: "#fafafa" }}>
                    <strong style={{ paddingLeft: "4rem" }}>{doc.direccionObra}</strong>
                  </td>
                </tr>
              )}

              {sectionData.map((sec, sIdx) => (
                <>
                  <tr key={`sec-${sec.id}`}>
                    <td style={c(S.num, S.secBg, S.extraBold)}>{toRoman(sIdx)}</td>
                    <td style={c(S.ud, S.secBg, S.extraBold)}></td>
                    <td style={c(S.desc, S.secBg, S.extraBold)}>{(sec.titulo || "").toUpperCase()}</td>
                    <td style={c(S.pu, S.secBg, S.extraBold)}></td>
                    <td style={c(S.cant, S.secBg, S.extraBold)}></td>
                    <td style={c(S.imp, S.secBg, S.extraBold)}></td>
                  </tr>
                  {sec.items.map((it) => (
                    <tr key={`item-${it.id}`}>
                      <td style={c(S.num)}>{it.globalNum}</td>
                      <td style={c(S.ud)}>{it.tieneImporte ? it.ud : ""}</td>
                      <td style={{ ...c(S.desc), paddingLeft: "1rem" }}>{it.descripcion}</td>
                      <td style={c(S.pu)}>{it.tieneImporte ? fmt(it.pu) : ""}</td>
                      <td style={c(S.cant)}>{it.tieneImporte ? it.cantidad : ""}</td>
                      <td style={c(S.imp, S.bold)}>{it.tieneImporte ? fmt(it.pu * it.cantidad) : ""}</td>
                    </tr>
                  ))}
                  {sec.mostrarTotal && (
                    <tr key={`sectotal-${sec.id}`}>
                      <td style={c(S.num, S.secTotalBg)}></td>
                      <td style={c(S.ud, S.secTotalBg)}></td>
                      <td style={c(S.desc, S.secTotalBg, S.bold)}>TOTAL {(sec.titulo || `SECCIÓN ${toRoman(sIdx)}`).toUpperCase()}</td>
                      <td style={c(S.pu, S.secTotalBg)}></td>
                      <td style={c(S.cant, S.secTotalBg)}></td>
                      <td style={c(S.imp, S.secTotalBg, S.extraBold)}>{fmt(sec.total)}</td>
                    </tr>
                  )}
                </>
              ))}

              <tr>
                <td style={{ ...S.cell, ...S.subBorder }}></td>
                <td style={{ ...S.cell, ...S.subBorder }}></td>
                <td style={{ ...S.cell, ...S.subBorder, ...S.bold }}>SUBTOTAL</td>
                <td style={{ ...S.cell, ...S.subBorder }}></td>
                <td style={{ ...S.cell, ...S.subBorder }}></td>
                <td style={{ ...S.cell, ...S.subBorder, ...S.imp, ...S.bold }}>{fmt(subtotal)}</td>
              </tr>
              <tr>
                <td style={{ ...S.cell, ...S.ivaBorder }}></td>
                <td style={{ ...S.cell, ...S.ivaBorder }}></td>
                <td style={{ ...S.cell, ...S.ivaBorder, ...S.bold }}>IVA ({doc.iva}%)</td>
                <td style={{ ...S.cell, ...S.ivaBorder }}></td>
                <td style={{ ...S.cell, ...S.ivaBorder }}></td>
                <td style={{ ...S.cell, ...S.ivaBorder, ...S.imp }}>{fmt(ivaAmt)}</td>
              </tr>
              <tr>
                <td style={{ ...S.cell, ...S.totalBorder }}></td>
                <td style={{ ...S.cell, ...S.totalBorder }}></td>
                <td style={{ ...S.cell, ...S.totalBorder }}>TOTAL</td>
                <td style={{ ...S.cell, ...S.totalBorder }}></td>
                <td style={{ ...S.cell, ...S.totalBorder }}></td>
                <td style={{ ...S.cell, ...S.totalBorder, ...S.imp }}>{fmt(total)}</td>
              </tr>
            </tbody>
          );
        })()}
      </table>

      <div className="doc-footer">
        {company.notaPorDefecto && (
          <p className="doc-nota"><strong>Nota:</strong> {company.notaPorDefecto}</p>
        )}
        <p className="doc-banco">{company.cuentaBanco}</p>
        <p className="doc-firma-label">Firma</p>
        <div className="doc-firmas">
          <div className="doc-firma-box">
            <div className="firma-line"></div>
            <span>Tu nombre</span>
            <span>Fecha</span>
          </div>
          <div className="doc-firma-box">
            <div className="firma-line"></div>
            <span>Nombre del cliente</span>
            <span>Fecha</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Document Form ──────────────────────────────────────
function DocForm ({ tipo, onSave, company, catalogo, clientes, editingDoc }) {
  const isEditing = !!editingDoc;
  const [doc, setDoc] = useState(() => {
    if (editingDoc) {
      return { ...editingDoc };
    }
    return emptyDoc(tipo, company.notaPorDefecto);
  });
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailTo, setEmailTo] = useState(editingDoc?.emailTo || "");
  const [sending, setSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);
  const { ref: pdfRef, download: downloadPdf, toBase64 } = useDownloadPdf();

  const upd = (field, val) => setDoc((d) => ({ ...d, [field]: val }));
  const updCli = (field, val) => setDoc((d) => ({ ...d, cliente: { ...d.cliente, [field]: val } }));

  const updateSection = (idx, sec) => {
    const copy = [...doc.secciones];
    copy[idx] = sec;
    upd("secciones", copy);
  };
  const removeSection = (idx) => upd("secciones", doc.secciones.filter((_, i) => i !== idx));
  const addSection = () => upd("secciones", [...doc.secciones, newSection()]);

  const autoSubtotal = doc.secciones.reduce(
    (s, sec) => {
      const itemsTotal = sec.items.reduce((si, it) => si + (it.tieneImporte ? it.pu * it.cantidad : 0), 0);
      return s + ((sec.mostrarTotal && sec.totalSeccion != null) ? sec.totalSeccion : itemsTotal);
    }, 0
  );
  const hasManualTotal = doc.totalManual != null && doc.totalManual !== "";
  const total = hasManualTotal ? (parseFloat(doc.totalManual) || 0) : autoSubtotal * (1 + doc.iva / 100);
  const subtotal = hasManualTotal ? total / (1 + doc.iva / 100) : autoSubtotal;
  const ivaAmt = total - subtotal;

  const titulo = tipo === "factura" ? "Factura" : "Presupuesto";
  const prefijo = tipo === "factura" ? "FACTURA" : "PRESUPUESTO";

  const handleSave = () => {
    const saveData = { ...doc, total, subtotal, ivaAmt, emailTo, creadoEn: new Date().toISOString() };
    if (isEditing) saveData._editId = editingDoc.id;
    onSave(saveData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDownload = () => {
    const nombre = `${prefijo}-${doc.numero || "SIN-NUMERO"}.pdf`;
    downloadPdf(nombre);
  };

  if (preview) {
    return (
      <div>
        <div className="preview-actions">
          <button onClick={() => setPreview(false)} className="btn-add-line">← Volver al formulario</button>
          <div className="preview-actions-right">
            <button onClick={handleDownload} className="btn btn-outline btn-download">Descargar PDF</button>
            <button onClick={handleSave} className={`btn ${tipo === "factura" ? "btn-primary" : "btn-amber"}`}>
              {isEditing ? "Actualizar" : "Guardar"} {titulo}
            </button>
          </div>
        </div>
        <DocPreview doc={doc} company={company} pdfRef={pdfRef} />
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-header">
        <div>
          <h2 className="page-title">{isEditing ? `Editando ${titulo}` : `Nueva ${titulo}`}</h2>
          <p className="page-subtitle">{isEditing ? "Modifica los datos y guarda los cambios" : "Rellena los datos y previsualiza antes de guardar"}</p>
        </div>
        {saved && <div className="success-msg">Guardado con éxito</div>}
      </div>

      <div className="form-section">
        <h3>Datos del documento</h3>
        <div className="form-grid-3">
          <div>
            <label className="form-label">Número</label>
            <input className="form-input" placeholder={tipo === "factura" ? "058" : "0157"} value={doc.numero} onChange={(e) => upd("numero", e.target.value)} />
          </div>
          <div>
            <label className="form-label">Fecha</label>
            <input type="date" className="form-input" value={doc.fecha} onChange={(e) => upd("fecha", e.target.value)} />
          </div>
          <div>
            <label className="form-label">IVA (%)</label>
            <select className="form-select" value={doc.iva} onChange={(e) => upd("iva", parseInt(e.target.value))}>
              <option value={21}>21% (General)</option>
              <option value={10}>10% (Reducido)</option>
              <option value={4}>4% (Superreducido)</option>
              <option value={0}>0% (Exento)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Datos del cliente</h3>
        {clientes.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label">Seleccionar cliente guardado</label>
            <select
              className="form-select"
              value=""
              onChange={(e) => {
                const sel = clientes.find((c) => c.id === parseInt(e.target.value));
                if (sel) {
                  updCli("nombre", sel.nombre);
                  updCli("nie", sel.nie || "");
                  updCli("direccion", sel.direccion || "");
                }
              }}
            >
              <option value="">— Seleccionar Cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre} {c.nie ? `(${c.nie})` : ""}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-grid-2">
          <div>
            <label className="form-label">CLIENTE (Nombre / Empresa)</label>
            <input className="form-input" placeholder="María" value={doc.cliente.nombre} onChange={(e) => updCli("nombre", e.target.value)} />
          </div>
          <div>
            <label className="form-label">NIE / NIF / CIF</label>
            <input className="form-input" placeholder="12345678A" value={doc.cliente.nie} onChange={(e) => updCli("nie", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="form-label">DIRECCIÓN</label>
            <input className="form-input" placeholder="Carrer Gavines, 1, 07181, Palmanova, Calvià, España" value={doc.cliente.direccion} onChange={(e) => updCli("direccion", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Dirección de la obra</h3>
        <div>
          <label className="form-label">Ubicación del trabajo</label>
          <input className="form-input" placeholder="C/ PÉREZ GALDÓS 9-A. 3-2" value={doc.direccionObra} onChange={(e) => upd("direccionObra", e.target.value)} />
        </div>
      </div>

      <div className="form-section">
        <h3>Partidas / Secciones</h3>
        <p className="page-subtitle" style={{ marginBottom: "1rem" }}>
          Cada sección agrupa conceptos. Marca "Con precio" solo en los ítems que llevan importe individual.
        </p>
        {doc.secciones.map((sec, sIdx) => (
          <SectionEditor key={sec.id} seccion={sec} secIdx={sIdx} onUpdate={(s) => updateSection(sIdx, s)} onRemove={() => removeSection(sIdx)} catalogo={catalogo} />
        ))}
        <button onClick={addSection} className="btn btn-outline" style={{ marginTop: "0.5rem" }}>+ Añadir sección</button>
      </div>

      <div className="form-section">
        <div className="totals-row" style={{ justifyContent: "flex-end" }}>
          <div className="totals-box">
            <div className="total-line"><span>Subtotal</span><span>{fmt(subtotal)} €</span></div>
            <div className="total-line"><span>IVA ({doc.iva}%)</span><span>{fmt(ivaAmt)} €</span></div>
            <label className="toggle-label" style={{ margin: "0.5rem 0", justifyContent: "flex-end" }}>
              <input
                type="checkbox"
                checked={hasManualTotal}
                onChange={(e) => upd("totalManual", e.target.checked ? total.toFixed(2) : null)}
              />
              <span className="toggle-text">Total manual</span>
            </label>
            {hasManualTotal ? (
              <div className="total-final" style={{ alignItems: "center" }}>
                <span>TOTAL</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={doc.totalManual}
                  onChange={(e) => upd("totalManual", e.target.value)}
                  style={{ width: "9rem", textAlign: "right", fontWeight: 700, padding: "0.25rem 0.5rem" }}
                />
              </div>
            ) : (
              <div className="total-final"><span>TOTAL</span><span>{fmt(total)} €</span></div>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Envío por Gmail</h3>
        <div>
          <label className="form-label">Enviar a (email del cliente)</label>
          <input className="form-input" placeholder="destinatario@email.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
        </div>
        {emailMsg && (
          <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: emailMsg.ok ? "#16a34a" : "#dc2626" }}>
            {emailMsg.text}
          </p>
        )}
      </div>

      <div className="actions-row">
        <button onClick={() => setPreview(true)} className="btn btn-outline">Previsualizar</button>
        <button onClick={handleSave} className={`btn ${tipo === "factura" ? "btn-primary" : "btn-amber"}`}>{isEditing ? "Actualizar" : "Guardar"} {titulo}</button>
        <button
          disabled={sending || !emailTo}
          className="btn btn-green"
          onClick={async () => {
            if (!window.electronAPI) {
              setEmailMsg({ ok: false, text: "El envío por email solo funciona en la aplicación de escritorio (Electron)." });
              return;
            }
            if (!company.gmailUser || !company.gmailAppPassword) {
              setEmailMsg({ ok: false, text: "Configura tu Gmail y contraseña de aplicación en Configuración." });
              return;
            }
            setSending(true);
            setEmailMsg(null);
            try {
              setPreview(true);
              await new Promise((r) => setTimeout(r, 500));
              const pdfBase64 = await toBase64();
              const filename = `${prefijo}-${doc.numero || "SIN-NUMERO"}.pdf`;
              const result = await window.electronAPI.sendEmail({
                gmailUser: company.gmailUser,
                gmailAppPassword: company.gmailAppPassword,
                to: emailTo,
                subject: `${titulo} ${doc.numero || ""} — ${company.nombre}`,
                body: `<p>Estimado/a ${doc.cliente.nombre || "cliente"},</p><p>Adjunto le envío el documento <strong>${titulo} ${doc.numero || ""}</strong>.</p><p>Un saludo,<br/>${company.nombre}<br/>Tel: ${company.telefono}</p>`,
                pdfBase64,
                pdfFilename: filename,
              });
              if (result.success) {
                setEmailMsg({ ok: true, text: `Email enviado correctamente a ${emailTo}` });
              } else {
                setEmailMsg({ ok: false, text: result.error });
              }
            } catch (err) {
              setEmailMsg({ ok: false, text: "Error al enviar: " + err.message });
            }
            setSending(false);
          }}
        >
          {sending ? "Enviando..." : "Enviar por Gmail"}
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────
function Dashboard ({ docs, company, onEdit, onDelete }) {
  const facturas = docs.filter((d) => d.tipo === "factura");
  const presupuestos = docs.filter((d) => d.tipo === "presupuesto");
  const totalFacturado = facturas.reduce((s, d) => s + (d.total || 0), 0);
  const totalPresupuestado = presupuestos.reduce((s, d) => s + (d.total || 0), 0);

  const [viewDoc, setViewDoc] = useState(null);
  const { ref: pdfRef, download: downloadPdf } = useDownloadPdf();

  const stats = [
    { label: "Facturas creadas", value: facturas.length, icon: "📋", color: "blue" },
    { label: "Presupuestos creados", value: presupuestos.length, icon: "📋", color: "amber" },
    { label: "Total facturado", value: fmt(totalFacturado) + " €", icon: "💰", color: "green" },
    { label: "Total presupuestado", value: fmt(totalPresupuestado) + " €", icon: "📊", color: "purple" },
  ];

  if (viewDoc) {
    const prefijo = viewDoc.tipo === "factura" ? "FACTURA" : "PRESUPUESTO";
    return (
      <div>
        <div className="preview-actions">
          <button onClick={() => setViewDoc(null)} className="btn-add-line">← Volver al panel</button>
          <button
            onClick={() => downloadPdf(`${prefijo}-${viewDoc.numero || "SIN-NUMERO"}.pdf`)}
            className="btn btn-outline btn-download"
          >
            Descargar PDF
          </button>
        </div>
        <DocPreview doc={viewDoc} company={company} pdfRef={pdfRef} />
      </div>
    );
  }

  const renderTable = (list, label) => {
    if (list.length === 0) return null;
    return (
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="card-header"><h3>{label}</h3></div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...list].reverse().map((d, i) => (
              <tr key={i}>
                <td className="font-medium">{d.numero || "—"}</td>
                <td>{d.cliente?.nombre || "—"}</td>
                <td style={{ color: "#6b7280" }}>{d.fecha}</td>
                <td className="text-right font-semibold">{fmt(d.total || 0)} €</td>
                <td className="text-right">
                  <button className="btn-table-action" onClick={() => setViewDoc(d)} title="Ver documento">
                    👁 Ver
                  </button>
                  <button className="btn-table-action" onClick={() => onEdit(d)} title="Editar documento" style={{ marginLeft: "0.5rem" }}>
                    ✏️ Editar
                  </button>
                  <button className="btn-table-action btn-table-delete" onClick={() => { if (window.confirm(`¿Eliminar ${d.tipo} ${d.numero || ""}?`)) onDelete(d); }} title="Eliminar documento" style={{ marginLeft: "0.5rem" }}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 className="page-title">Panel de control</h2>
        <p className="page-subtitle">Resumen de tu actividad</p>
      </div>
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className={`stat-card ${s.color}`}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>Aún no hay documentos</h3>
          <p>Crea tu primera factura o presupuesto desde el menú lateral</p>
        </div>
      ) : (
        <>
          {renderTable(facturas, "📋 Facturas")}
          {renderTable(presupuestos, "📋 Presupuestos")}
        </>
      )}
    </div>
  );
}

// ─── Historial ──────────────────────────────────────────
function Historial ({ docs, company, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [tab, setTab] = useState("facturas");
  const [busqueda, setBusqueda] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [mostrarFechas, setMostrarFechas] = useState(false);
  const { ref: pdfRef, download: downloadPdf } = useDownloadPdf();

  const filtrar = (list) => {
    let resultado = list;
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      resultado = resultado.filter((d) =>
        (d.numero || "").toLowerCase().includes(q) ||
        (d.cliente?.nombre || "").toLowerCase().includes(q)
      );
    }
    if (fechaDesde) {
      resultado = resultado.filter((d) => d.fecha >= fechaDesde);
    }
    if (fechaHasta) {
      resultado = resultado.filter((d) => d.fecha <= fechaHasta);
    }
    return resultado;
  };

  const facturas = filtrar(docs.filter((d) => d.tipo === "factura"));
  const presupuestos = filtrar(docs.filter((d) => d.tipo === "presupuesto"));

  if (viewDoc) {
    const prefijo = viewDoc.tipo === "factura" ? "FACTURA" : "PRESUPUESTO";
    return (
      <div>
        <div className="preview-actions">
          <button onClick={() => setViewDoc(null)} className="btn-add-line">← Volver al historial</button>
          <button onClick={() => { setViewDoc(null); onEdit(viewDoc); }} className="btn btn-outline">
            ✏️ Editar
          </button>
          <button
            onClick={() => downloadPdf(`${prefijo}-${viewDoc.numero || "SIN-NUMERO"}.pdf`)}
            className="btn btn-outline btn-download"
          >
            Descargar PDF
          </button>
        </div>
        <DocPreview doc={viewDoc} company={company} pdfRef={pdfRef} />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📁</div>
        <h3>Sin documentos todavía</h3>
      </div>
    );
  }

  const currentList = tab === "facturas" ? facturas : presupuestos;

  return (
    <div>
      <h2 className="page-title" style={{ marginBottom: "1rem" }}>Historial de documentos</h2>

      <div className="historial-filters">
        <input
          className="form-input"
          placeholder="Buscar por cliente o número..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1, maxWidth: "22rem" }}
        />
        <button
          className={`btn ${mostrarFechas ? "btn-primary" : "btn-outline"}`}
          onClick={() => setMostrarFechas(!mostrarFechas)}
          style={{ whiteSpace: "nowrap" }}
        >
          📅 Filtrar por fecha
        </button>
        {(busqueda || fechaDesde || fechaHasta) && (
          <button
            className="btn btn-outline"
            onClick={() => { setBusqueda(""); setFechaDesde(""); setFechaHasta(""); setMostrarFechas(false); }}
            style={{ whiteSpace: "nowrap" }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
      {mostrarFechas && (
        <div className="historial-date-filter">
          <div className="date-field">
            <label className="form-label">Desde</label>
            <input type="date" className="form-input" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div className="date-field">
            <label className="form-label">Hasta</label>
            <input type="date" className="form-input" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-bar">
        <button className={`tab-btn ${tab === "facturas" ? "active" : ""}`} onClick={() => setTab("facturas")}>
          📋 Facturas ({facturas.length})
        </button>
        <button className={`tab-btn ${tab === "presupuestos" ? "active" : ""}`} onClick={() => setTab("presupuestos")}>
          📋 Presupuestos ({presupuestos.length})
        </button>
      </div>

      {currentList.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "1rem" }}>
          <div className="empty-icon">{tab === "facturas" ? "📋" : "📋"}</div>
          <h3>No hay {tab} todavía</h3>
        </div>
      ) : (
        <div className="historial-list">
          {[...currentList].reverse().map((d, i) => (
            <div key={i} className="historial-item">
              <div className="historial-item-top">
                <div>
                  <span className={`badge ${d.tipo}`}>{d.tipo === "factura" ? "Factura" : "Presupuesto"}</span>
                  <span className="font-semibold" style={{ marginLeft: "0.75rem", color: "#1f2937" }}>
                    {d.numero || "Sin número"}
                  </span>
                </div>
                <span className="historial-total">{fmt(d.total || 0)} €</span>
              </div>
              <div className="historial-details">
                <span>Cliente: {d.cliente?.nombre || "—"}</span>
                <span>Fecha: {d.fecha}</span>
                <span>{d.secciones?.length || 0} sección(es)</span>
              </div>
              <div className="historial-actions">
                <button className="btn btn-sm btn-outline" onClick={() => setViewDoc(d)}>
                  👁 Ver documento
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => onEdit(d)}>
                  ✏️ Editar
                </button>
                <button
                  className="btn btn-sm btn-outline btn-download"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewDoc(d);
                    setTimeout(() => {
                      const prefijo = d.tipo === "factura" ? "FACTURA" : "PRESUPUESTO";
                      downloadPdf(`${prefijo}-${d.numero || "SIN-NUMERO"}.pdf`);
                    }, 500);
                  }}
                >
                  📥 Descargar PDF
                </button>
                {confirmDelete === d.id ? (
                  <>
                    <span style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 600 }}>¿Seguro?</span>
                    <button className="btn btn-sm btn-danger" onClick={() => { onDelete(d); setConfirmDelete(null); }}>
                      Sí, eliminar
                    </button>
                    <button className="btn btn-sm btn-outline" onClick={() => setConfirmDelete(null)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button className="btn btn-sm btn-outline btn-delete" onClick={() => setConfirmDelete(d.id)}>
                    🗑 Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Resumen ────────────────────────────────────────────
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function Resumen ({ docs }) {
  const facturas = docs.filter((d) => d.tipo === "factura");
  const presupuestos = docs.filter((d) => d.tipo === "presupuesto");

  // Get available years
  const allYears = [...new Set(docs.map((d) => d.fecha?.split("-")[0]).filter(Boolean))].sort().reverse();
  const [selectedYear, setSelectedYear] = useState(allYears[0] || new Date().getFullYear().toString());
  const [vista, setVista] = useState("mensual");

  // Monthly data for selected year
  const monthlyData = MESES.map((mes, idx) => {
    const monthStr = String(idx + 1).padStart(2, "0");
    const prefix = `${selectedYear}-${monthStr}`;
    const facMes = facturas.filter((d) => d.fecha?.startsWith(prefix));
    const preMes = presupuestos.filter((d) => d.fecha?.startsWith(prefix));
    return {
      mes,
      numFacturas: facMes.length,
      totalFacturas: facMes.reduce((s, d) => s + (d.total || 0), 0),
      numPresupuestos: preMes.length,
      totalPresupuestos: preMes.reduce((s, d) => s + (d.total || 0), 0),
    };
  });

  const totalAnualFacturas = monthlyData.reduce((s, m) => s + m.totalFacturas, 0);
  const totalAnualPresupuestos = monthlyData.reduce((s, m) => s + m.totalPresupuestos, 0);
  const numAnualFacturas = monthlyData.reduce((s, m) => s + m.numFacturas, 0);
  const numAnualPresupuestos = monthlyData.reduce((s, m) => s + m.numPresupuestos, 0);
  const maxMensual = Math.max(...monthlyData.map((m) => m.totalFacturas + m.totalPresupuestos), 1);

  // Annual summary across all years
  const annualData = allYears.map((year) => {
    const facYear = facturas.filter((d) => d.fecha?.startsWith(year));
    const preYear = presupuestos.filter((d) => d.fecha?.startsWith(year));
    return {
      year,
      numFacturas: facYear.length,
      totalFacturas: facYear.reduce((s, d) => s + (d.total || 0), 0),
      numPresupuestos: preYear.length,
      totalPresupuestos: preYear.reduce((s, d) => s + (d.total || 0), 0),
    };
  });

  return (
    <div>
      <div className="form-header">
        <div>
          <h2 className="page-title">Resumen Financiero</h2>
          <p className="page-subtitle">Control de facturación para impuestos y contabilidad</p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="stat-card blue">
          <div className="stat-icon">🧾</div>
          <div className="stat-value">{numAnualFacturas}</div>
          <div className="stat-label">Facturas {selectedYear}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{fmt(totalAnualFacturas)} €</div>
          <div className="stat-label">Facturado {selectedYear}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{numAnualPresupuestos}</div>
          <div className="stat-label">Presupuestos {selectedYear}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{fmt(totalAnualPresupuestos)} €</div>
          <div className="stat-label">Presupuestado {selectedYear}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="resumen-controls">
        <div className="tabs-bar">
          <button className={`tab-btn ${vista === "mensual" ? "active" : ""}`} onClick={() => setVista("mensual")}>
            📅 Mensual
          </button>
          <button className={`tab-btn ${vista === "anual" ? "active" : ""}`} onClick={() => setVista("anual")}>
            📆 Anual
          </button>
        </div>
        {vista === "mensual" && (
          <select className="form-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} style={{ width: "auto" }}>
            {allYears.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
            {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {vista === "mensual" ? (
        <div className="resumen-table-container">
          <table className="resumen-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th className="text-right">Facturas</th>
                <th className="text-right">Total Facturas</th>
                <th className="text-right">Presupuestos</th>
                <th className="text-right">Total Presup.</th>
                <th className="text-right">Total Mes</th>
                <th style={{ width: "20%" }}></th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((m, idx) => {
                const totalMes = m.totalFacturas + m.totalPresupuestos;
                const pct = (totalMes / maxMensual) * 100;
                const hasData = m.numFacturas > 0 || m.numPresupuestos > 0;
                return (
                  <tr key={idx} className={hasData ? "" : "resumen-row-empty"}>
                    <td className="font-medium">{m.mes}</td>
                    <td className="text-right">{m.numFacturas || "—"}</td>
                    <td className="text-right">{m.numFacturas ? fmt(m.totalFacturas) + " €" : "—"}</td>
                    <td className="text-right">{m.numPresupuestos || "—"}</td>
                    <td className="text-right">{m.numPresupuestos ? fmt(m.totalPresupuestos) + " €" : "—"}</td>
                    <td className="text-right font-semibold">{hasData ? fmt(totalMes) + " €" : "—"}</td>
                    <td>
                      <div className="resumen-bar-bg">
                        <div className="resumen-bar-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="resumen-total-row">
                <td className="font-semibold">TOTAL {selectedYear}</td>
                <td className="text-right font-semibold">{numAnualFacturas}</td>
                <td className="text-right font-semibold">{fmt(totalAnualFacturas)} €</td>
                <td className="text-right font-semibold">{numAnualPresupuestos}</td>
                <td className="text-right font-semibold">{fmt(totalAnualPresupuestos)} €</td>
                <td className="text-right font-semibold">{fmt(totalAnualFacturas + totalAnualPresupuestos)} €</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {/* IVA summary */}
          <div className="resumen-iva-box">
            <h3>Resumen IVA — {selectedYear}</h3>
            <div className="resumen-iva-grid">
              <div>
                <span className="resumen-iva-label">Base imponible (facturas)</span>
                <span className="resumen-iva-value">{fmt(facturas.filter((d) => d.fecha?.startsWith(selectedYear)).reduce((s, d) => s + (d.subtotal || 0), 0))} €</span>
              </div>
              <div>
                <span className="resumen-iva-label">IVA repercutido (facturas)</span>
                <span className="resumen-iva-value">{fmt(facturas.filter((d) => d.fecha?.startsWith(selectedYear)).reduce((s, d) => s + (d.ivaAmt || 0), 0))} €</span>
              </div>
              <div>
                <span className="resumen-iva-label">Total facturado</span>
                <span className="resumen-iva-value font-semibold">{fmt(totalAnualFacturas)} €</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="resumen-table-container">
          {annualData.length === 0 ? (
            <div className="empty-state" style={{ marginTop: "1rem" }}>
              <div className="empty-icon">📊</div>
              <h3>Sin datos todavía</h3>
            </div>
          ) : (
            <table className="resumen-table">
              <thead>
                <tr>
                  <th>Año</th>
                  <th className="text-right">Facturas</th>
                  <th className="text-right">Total Facturas</th>
                  <th className="text-right">Presupuestos</th>
                  <th className="text-right">Total Presup.</th>
                  <th className="text-right">Total Año</th>
                </tr>
              </thead>
              <tbody>
                {annualData.map((a) => (
                  <tr key={a.year}>
                    <td className="font-semibold">{a.year}</td>
                    <td className="text-right">{a.numFacturas}</td>
                    <td className="text-right">{fmt(a.totalFacturas)} €</td>
                    <td className="text-right">{a.numPresupuestos}</td>
                    <td className="text-right">{fmt(a.totalPresupuestos)} €</td>
                    <td className="text-right font-semibold">{fmt(a.totalFacturas + a.totalPresupuestos)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Clientes ───────────────────────────────────────────
function Clientes ({ clientes, setClientes }) {
  const [filtro, setFiltro] = useState("");
  const [editando, setEditando] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: "", nie: "", direccion: "", telefono: "", email: "" });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = clientes.filter((c) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return c.nombre.toLowerCase().includes(q) ||
      (c.nie || "").toLowerCase().includes(q) ||
      (c.direccion || "").toLowerCase().includes(q);
  });

  const handleSave = () => {
    if (editando !== null) {
      setClientes((prev) => prev.map((c) => (c.id === editando ? { ...form, id: editando } : c)));
      setEditando(null);
    } else {
      setClientes((prev) => [...prev, { ...form, id: Date.now() }]);
    }
    setForm({ nombre: "", nie: "", direccion: "", telefono: "", email: "" });
    setNuevo(false);
  };

  const handleEdit = (cliente) => {
    setForm({ nombre: cliente.nombre, nie: cliente.nie || "", direccion: cliente.direccion || "", telefono: cliente.telefono || "", email: cliente.email || "" });
    setEditando(cliente.id);
    setNuevo(true);
  };

  const handleDelete = (id) => {
    setClientes((prev) => prev.filter((c) => c.id !== id));
    setConfirmDelete(null);
  };

  const handleCancel = () => {
    setForm({ nombre: "", nie: "", direccion: "", telefono: "", email: "" });
    setEditando(null);
    setNuevo(false);
  };

  return (
    <div>
      <div className="form-header">
        <div>
          <h2 className="page-title">Agenda de Clientes</h2>
          <p className="page-subtitle">{clientes.length} cliente(s) guardado(s)</p>
        </div>
        {!nuevo && (
          <button className="btn btn-primary" onClick={() => setNuevo(true)}>+ Nuevo cliente</button>
        )}
      </div>

      {nuevo && (
        <div className="form-section" style={{ marginBottom: "1.5rem" }}>
          <h3>{editando ? "Editar cliente" : "Nuevo cliente"}</h3>
          <div className="form-grid-2">
            <div>
              <label className="form-label">Nombre / Empresa</label>
              <input className="form-input" placeholder="María García" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="form-label">NIE / NIF / CIF</label>
              <input className="form-input" placeholder="12345678A" value={form.nie} onChange={(e) => setForm({ ...form, nie: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="form-label">Dirección</label>
              <input className="form-input" placeholder="Carrer Gavines, 1, 07181, Palmanova" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Teléfono</label>
              <input className="form-input" placeholder="612345678" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="cliente@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button className="btn btn-outline" onClick={handleCancel}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.nombre}>
              {editando ? "Guardar cambios" : "Añadir cliente"}
            </button>
          </div>
        </div>
      )}

      <input
        className="form-input"
        placeholder="Buscar por nombre, NIE o dirección..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        style={{ marginBottom: "1rem", maxWidth: "25rem" }}
      />

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "1rem" }}>
          <div className="empty-icon">👥</div>
          <h3>{filtro ? "No hay clientes que coincidan" : "Sin clientes todavía"}</h3>
          <p>{filtro ? "Prueba con otra búsqueda" : "Añade tu primer cliente con el botón de arriba"}</p>
        </div>
      ) : (
        <div className="clientes-list">
          {filtered.map((c) => (
            <div key={c.id} className="cliente-card">
              <div className="cliente-info">
                <div className="cliente-nombre">{c.nombre}</div>
                <div className="cliente-detalles">
                  {c.nie && <span>NIE: {c.nie}</span>}
                  {c.direccion && <span>{c.direccion}</span>}
                  {c.telefono && <span>Tel: {c.telefono}</span>}
                  {c.email && <span>{c.email}</span>}
                </div>
              </div>
              <div className="cliente-actions">
                <button className="btn-table-action" onClick={() => handleEdit(c)}>✏️ Editar</button>
                {confirmDelete === c.id ? (
                  <>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>Sí, eliminar</button>
                    <button className="btn btn-sm btn-outline" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                  </>
                ) : (
                  <button className="btn-table-action btn-table-delete" onClick={() => setConfirmDelete(c.id)}>🗑 Eliminar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Config ─────────────────────────────────────────────
function Config ({ company, setCompany, onImportData }) {
  const upd = (field, val) => setCompany((c) => ({ ...c, [field]: val }));
  const [backupMsg, setBackupMsg] = useState(null);
  const fields = [
    { field: "nombre", label: "Nombre completo", placeholder: "JHONY SANDRO CLAROS SALINAS" },
    { field: "dni", label: "DNI", placeholder: "49612445L" },
    { field: "direccion", label: "Calle", placeholder: "CALLE ARAGÓN Nº 40 1º" },
    { field: "codigoPostal", label: "Código Postal", placeholder: "07006" },
    { field: "telefono", label: "Teléfono", placeholder: "647141851" },
    { field: "ciudad", label: "Ciudad", placeholder: "PALMA DE MALLORCA" },
    { field: "cuentaBanco", label: "Cuenta bancaria", placeholder: "Cuenta Banco Caixa ES22 2222 2222 2222" },
  ];

  return (
    <div style={{ maxWidth: "36rem" }}>
      <h2 className="page-title">Configuración</h2>
      <p className="page-subtitle" style={{ marginBottom: "1.5rem" }}>Datos que aparecerán en la cabecera de tus documentos</p>
      <div className="form-section">
        <div className="config-form">
          {fields.map((f) => (
            <div key={f.field}>
              <label className="form-label">{f.label}</label>
              <input className="form-input" placeholder={f.placeholder} value={company[f.field]} onChange={(e) => upd(f.field, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <h3 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>Nota</h3>
      <p className="page-subtitle" style={{ marginBottom: "1rem" }}>Este texto aparecerá al final de todas las facturas y presupuestos (condiciones de pago, aviso legal, etc.)</p>
      <div className="form-section">
        <div className="config-form">
          <div>
            <label className="form-label">Nota por defecto</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Ej: El pago deberá realizarse en un plazo máximo de 15 días desde la emisión de la factura mediante transferencia bancaria..."
              value={company.notaPorDefecto}
              onChange={(e) => upd("notaPorDefecto", e.target.value)}
            />
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>Configuración Gmail</h3>
      <p className="page-subtitle" style={{ marginBottom: "1rem" }}>Para enviar facturas y presupuestos por email directamente desde la app</p>
      <div className="form-section">
        <div className="config-form">
          <div>
            <label className="form-label">Correo Gmail</label>
            <input className="form-input" type="email" placeholder="tucorreo@gmail.com" value={company.gmailUser} onChange={(e) => upd("gmailUser", e.target.value)} />
          </div>
          <div>
            <label className="form-label">Contraseña de aplicación</label>
            <input className="form-input" type="password" placeholder="xxxx xxxx xxxx xxxx" value={company.gmailAppPassword} onChange={(e) => upd("gmailAppPassword", e.target.value)} />
            <p style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.25rem" }}>
              Ve a <strong>myaccount.google.com → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones</strong> y genera una para "Correo".
            </p>
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: "2rem", marginBottom: "0.5rem" }}>Copia de seguridad</h3>
      <p className="page-subtitle" style={{ marginBottom: "1rem" }}>Exporta tus datos para no perderlos si se estropea el ordenador</p>
      <div className="form-section">
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={async () => {
              if (!window.electronAPI) { setBackupMsg({ ok: false, text: "Solo funciona en Electron" }); return; }
              const res = await window.electronAPI.exportData();
              if (res.success) setBackupMsg({ ok: true, text: `Copia guardada en: ${res.path}` });
              else if (res.error !== "Cancelado") setBackupMsg({ ok: false, text: res.error });
            }}
          >
            📤 Exportar datos
          </button>
          <button
            className="btn btn-outline"
            onClick={async () => {
              if (!window.electronAPI) { setBackupMsg({ ok: false, text: "Solo funciona en Electron" }); return; }
              const res = await window.electronAPI.importData();
              if (res.success) {
                onImportData(res.data);
                setBackupMsg({ ok: true, text: "Datos importados correctamente. La app se ha actualizado." });
              } else if (res.error !== "Cancelado") {
                setBackupMsg({ ok: false, text: res.error });
              }
            }}
          >
            📥 Importar datos
          </button>
        </div>
        {backupMsg && (
          <p style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: backupMsg.ok ? "#16a34a" : "#dc2626" }}>
            {backupMsg.text}
          </p>
        )}
        <p style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.5rem" }}>
          Guarda la copia en un USB, Google Drive o envíatela por email. Si algún día pierdes el ordenador, importa el archivo y recuperas todo.
        </p>
      </div>
    </div>
  );
}

// ─── Catálogo de Precios ────────────────────────────────
function Catalogo ({ catalogo, setCatalogo }) {
  const [filtro, setFiltro] = useState("");
  const [catFiltro, setCatFiltro] = useState("Todas");
  const [editando, setEditando] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ codigo: "", categoria: "Albañilería", descripcion: "", unidad: "ud", precio: 0 });

  const categorias = ["Todas", ...CATEGORIAS_CATALOGO];

  const filtered = catalogo.filter((p) => {
    const matchText = filtro === "" ||
      p.descripcion.toLowerCase().includes(filtro.toLowerCase()) ||
      p.codigo.toLowerCase().includes(filtro.toLowerCase());
    const matchCat = catFiltro === "Todas" || p.categoria === catFiltro;
    return matchText && matchCat;
  });

  const handleSave = () => {
    if (editando !== null) {
      setCatalogo((prev) => prev.map((p) => (p.id === editando ? { ...form, id: editando } : p)));
      setEditando(null);
    } else {
      setCatalogo((prev) => [...prev, { ...form, id: Date.now() }]);
    }
    setForm({ codigo: "", categoria: "Albañilería", descripcion: "", unidad: "ud", precio: 0 });
    setNuevo(false);
  };

  const handleEdit = (item) => {
    setForm({ codigo: item.codigo, categoria: item.categoria, descripcion: item.descripcion, unidad: item.unidad, precio: item.precio });
    setEditando(item.id);
    setNuevo(true);
  };

  const handleDelete = (id) => {
    setCatalogo((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCancel = () => {
    setForm({ codigo: "", categoria: "Albañilería", descripcion: "", unidad: "ud", precio: 0 });
    setEditando(null);
    setNuevo(false);
  };

  return (
    <div>
      <div className="form-header">
        <div>
          <h2 className="page-title">Catálogo de Precios</h2>
          <p className="page-subtitle">{catalogo.length} partida(s) registradas — busca o añade nuevas</p>
        </div>
        {!nuevo && (
          <button className="btn btn-primary" onClick={() => setNuevo(true)}>+ Nueva partida</button>
        )}
      </div>

      {/* Add/Edit form */}
      {nuevo && (
        <div className="form-section catalogo-form">
          <h3>{editando ? "Editar partida" : "Nueva partida"}</h3>
          <div className="catalogo-form-grid">
            <div>
              <label className="form-label">Código</label>
              <input className="form-input" placeholder="001" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Categoría</label>
              <select className="form-select" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {CATEGORIAS_CATALOGO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="catalogo-form-wide">
              <label className="form-label">Descripción</label>
              <input className="form-input" placeholder="Embaldosado de suelo con baldosa cerámica" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Unidad (m², ud, ml, h...)</label>
              <input className="form-input" placeholder="m²" value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
            </div>
            <div>
              <label className="form-label">Precio (€)</label>
              <input type="number" min="0" step="0.01" className="form-input" value={form.precio} onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="catalogo-form-actions">
            <button className="btn btn-outline" onClick={handleCancel}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.descripcion}>
              {editando ? "Guardar cambios" : "Añadir partida"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="catalogo-filters">
        <input
          className="form-input catalogo-search-input"
          placeholder="Buscar por descripción o código..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <select className="form-select catalogo-cat-select" value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}>
          {categorias.map((c) => <option key={c} value={c}>{c} {c !== "Todas" ? `(${catalogo.filter(p => p.categoria === c).length})` : ""}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "1rem" }}>
          <div className="empty-icon">📖</div>
          <h3>No hay partidas {filtro ? "que coincidan" : "todavía"}</h3>
          <p>{filtro ? "Prueba con otra búsqueda" : "Añade tu primera partida con el botón de arriba"}</p>
        </div>
      ) : (
        <div className="catalogo-list">
          {filtered.map((p) => (
            <div key={p.id} className="catalogo-item">
              <div className="catalogo-item-left">
                <span className="catalogo-item-cat">{p.categoria}</span>
                <span className="catalogo-item-codigo">{p.codigo}</span>
                <span className="catalogo-item-desc">{p.descripcion}</span>
              </div>
              <div className="catalogo-item-right">
                <span className="catalogo-item-price">{fmt(p.precio)} €/{p.unidad}</span>
                <button className="btn-table-action" onClick={() => handleEdit(p)}>Editar</button>
                <button className="btn-table-action btn-table-delete" onClick={() => handleDelete(p.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────
export default function App () {
  const [view, setView] = useState("dashboard");
  const [docs, setDocs] = useState([]);
  const [company, setCompany] = useState(INITIAL_COMPANY);
  const [catalogo, setCatalogo] = useState(CATALOGO_INICIAL);
  const [clientes, setClientes] = useState([]);
  const [editingDoc, setEditingDoc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Load saved data on startup
  useEffect(() => {
    async function loadData () {
      if (window.electronAPI) {
        const savedDocs = await window.electronAPI.storeGet("docs");
        const savedCompany = await window.electronAPI.storeGet("company");
        const savedCatalogo = await window.electronAPI.storeGet("catalogo");
        const savedClientes = await window.electronAPI.storeGet("clientes");
        if (savedDocs) setDocs(savedDocs);
        if (savedCompany) setCompany(savedCompany);
        if (savedCatalogo) setCatalogo(savedCatalogo);
        if (savedClientes) setClientes(savedClientes);
      }
      setLoaded(true);
    }
    loadData();
  }, []);

  // Auto-save whenever data changes
  useEffect(() => {
    if (!loaded || !window.electronAPI) return;
    window.electronAPI.storeSet("docs", docs);
  }, [docs, loaded]);

  useEffect(() => {
    if (!loaded || !window.electronAPI) return;
    window.electronAPI.storeSet("company", company);
  }, [company, loaded]);

  useEffect(() => {
    if (!loaded || !window.electronAPI) return;
    window.electronAPI.storeSet("catalogo", catalogo);
  }, [catalogo, loaded]);

  useEffect(() => {
    if (!loaded || !window.electronAPI) return;
    window.electronAPI.storeSet("clientes", clientes);
  }, [clientes, loaded]);

  const addDoc = (doc) => {
    if (doc._editId) {
      // Updating existing document
      const editId = doc._editId;
      delete doc._editId;
      setDocs((prev) => prev.map((d) => (d.id === editId ? { ...doc, id: editId } : d)));
    } else {
      // New document
      setDocs((prev) => [...prev, { ...doc, id: Date.now() }]);
    }
    setEditingDoc(null);
    setView("dashboard");
  };

  const handleEdit = (doc) => {
    setEditingDoc(doc);
    setView(doc.tipo === "factura" ? "nueva-factura" : "nuevo-presupuesto");
  };

  const handleDelete = (doc) => {
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const content = {
    dashboard: <Dashboard docs={docs} company={company} onEdit={handleEdit} onDelete={handleDelete} />,
    "nueva-factura": <DocForm key={editingDoc ? `edit-${editingDoc.id}` : "factura"} tipo="factura" onSave={addDoc} company={company} catalogo={catalogo} clientes={clientes} editingDoc={editingDoc && editingDoc.tipo === "factura" ? editingDoc : null} />,
    "nuevo-presupuesto": <DocForm key={editingDoc ? `edit-${editingDoc.id}` : "presupuesto"} tipo="presupuesto" onSave={addDoc} company={company} catalogo={catalogo} clientes={clientes} editingDoc={editingDoc && editingDoc.tipo === "presupuesto" ? editingDoc : null} />,
    clientes: <Clientes clientes={clientes} setClientes={setClientes} />,
    catalogo: <Catalogo catalogo={catalogo} setCatalogo={setCatalogo} />,
    historial: <Historial docs={docs} company={company} onEdit={handleEdit} onDelete={handleDelete} />,
    resumen: <Resumen docs={docs} />,
    config: <Config company={company} setCompany={setCompany} onImportData={(data) => {
      if (data.docs) setDocs(data.docs);
      if (data.company) setCompany(data.company);
      if (data.catalogo) setCatalogo(data.catalogo);
      if (data.clientes) setClientes(data.clientes);
    }} />,
  };

  return (
    <div className="app-layout">
      <Sidebar
        view={view}
        setView={(v) => { setEditingDoc(null); setView(v); }}
        counts={{
          facturas: docs.filter((d) => d.tipo === "factura").length,
          presupuestos: docs.filter((d) => d.tipo === "presupuesto").length,
        }}
      />
      <main className="main-content">{content[view]}</main>
    </div>
  );
}