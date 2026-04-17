import { useState, useRef, useCallback, useEffect } from "react";
import html2pdf from "html2pdf.js";

// ─── Data defaults ──────────────────────────────────────
const INITIAL_COMPANY = {
  nombre: "JHONY SANDRO CLAROS SALINAS",
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
    { id: "dashboard", label: "Panel", icon: "📊" },
    { id: "nueva-factura", label: "Nueva Factura", icon: "🧾" },
    { id: "nuevo-presupuesto", label: "Nuevo Presupuesto", icon: "📋" },
    { id: "catalogo", label: "Catálogo Precios", icon: "📖" },
    { id: "historial", label: "Historial", icon: "📁" },
    { id: "config", label: "Configuración", icon: "⚙️" },
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
    </div>
  );
}

// ─── Document Preview (matches PDF format) ──────────────
function DocPreview ({ doc, company, pdfRef }) {
  const titulo = doc.tipo === "factura" ? "FACTURA" : "PRESUPUESTO";

  let globalItemNum = 0;
  const sectionData = doc.secciones.map((sec) => {
    const total = sec.items.reduce((s, it) => s + (it.tieneImporte ? it.pu * it.cantidad : 0), 0);
    const items = sec.items.map((it) => {
      globalItemNum++;
      return { ...it, globalNum: globalItemNum };
    });
    return { ...sec, items, total };
  });

  const subtotal = sectionData.reduce((s, sec) => s + sec.total, 0);
  const ivaAmt = subtotal * (doc.iva / 100);
  const total = subtotal + ivaAmt;

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
            secBg: { backgroundColor: "#f9f9f9" },
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
                    <td style={c(S.num, S.secBg)}>{toRoman(sIdx)}</td>
                    <td style={c(S.ud, S.secBg)}>ud</td>
                    <td style={c(S.desc, S.secBg, S.bold)}>{sec.titulo}</td>
                    <td style={c(S.pu, S.secBg)}>{fmt(sec.total)}</td>
                    <td style={c(S.cant, S.secBg)}>1</td>
                    <td style={c(S.imp, S.secBg)}>{fmt(sec.total)}</td>
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
        <p className="doc-nota"><strong>Nota:</strong> {doc.notas}</p>
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
function DocForm ({ tipo, onSave, company, catalogo }) {
  const [doc, setDoc] = useState(emptyDoc(tipo, company.notaPorDefecto));
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailTo, setEmailTo] = useState("");
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

  const subtotal = doc.secciones.reduce(
    (s, sec) => s + sec.items.reduce((si, it) => si + (it.tieneImporte ? it.pu * it.cantidad : 0), 0), 0
  );
  const ivaAmt = subtotal * (doc.iva / 100);
  const total = subtotal + ivaAmt;

  const titulo = tipo === "factura" ? "Factura" : "Presupuesto";
  const prefijo = tipo === "factura" ? "FACTURA" : "PRESUPUESTO";

  const handleSave = () => {
    onSave({ ...doc, total, subtotal, ivaAmt, emailTo, creadoEn: new Date().toISOString() });
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
              Guardar {titulo}
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
          <h2 className="page-title">Nueva {titulo}</h2>
          <p className="page-subtitle">Rellena los datos y previsualiza antes de guardar</p>
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
        <div className="totals-row">
          <div style={{ flex: 1, marginRight: "2rem" }}>
            <label className="form-label">Nota de condiciones de pago (puedes editarla para este trabajo)</label>
            <textarea className="form-textarea" rows={4} placeholder="Escribe las condiciones de pago para este trabajo..." value={doc.notas} onChange={(e) => upd("notas", e.target.value)} />
          </div>
          <div className="totals-box">
            <div className="total-line"><span>Subtotal</span><span>{fmt(subtotal)} €</span></div>
            <div className="total-line"><span>IVA ({doc.iva}%)</span><span>{fmt(ivaAmt)} €</span></div>
            <div className="total-final"><span>TOTAL</span><span>{fmt(total)} €</span></div>
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
        <button onClick={handleSave} className={`btn ${tipo === "factura" ? "btn-primary" : "btn-amber"}`}>Guardar {titulo}</button>
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
function Dashboard ({ docs, company }) {
  const facturas = docs.filter((d) => d.tipo === "factura");
  const presupuestos = docs.filter((d) => d.tipo === "presupuesto");
  const totalFacturado = facturas.reduce((s, d) => s + (d.total || 0), 0);
  const totalPresupuestado = presupuestos.reduce((s, d) => s + (d.total || 0), 0);

  const [viewDoc, setViewDoc] = useState(null);
  const { ref: pdfRef, download: downloadPdf } = useDownloadPdf();

  const stats = [
    { label: "Facturas creadas", value: facturas.length, icon: "🧾", color: "blue" },
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
              <th className="text-right">Acciones</th>
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
          {renderTable(facturas, "🧾 Facturas")}
          {renderTable(presupuestos, "📋 Presupuestos")}
        </>
      )}
    </div>
  );
}

// ─── Historial ──────────────────────────────────────────
function Historial ({ docs, company }) {
  const facturas = docs.filter((d) => d.tipo === "factura");
  const presupuestos = docs.filter((d) => d.tipo === "presupuesto");
  const [viewDoc, setViewDoc] = useState(null);
  const [tab, setTab] = useState("facturas");
  const { ref: pdfRef, download: downloadPdf } = useDownloadPdf();

  if (viewDoc) {
    const prefijo = viewDoc.tipo === "factura" ? "FACTURA" : "PRESUPUESTO";
    return (
      <div>
        <div className="preview-actions">
          <button onClick={() => setViewDoc(null)} className="btn-add-line">← Volver al historial</button>
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

      {/* Tabs */}
      <div className="tabs-bar">
        <button className={`tab-btn ${tab === "facturas" ? "active" : ""}`} onClick={() => setTab("facturas")}>
          🧾 Facturas ({facturas.length})
        </button>
        <button className={`tab-btn ${tab === "presupuestos" ? "active" : ""}`} onClick={() => setTab("presupuestos")}>
          📋 Presupuestos ({presupuestos.length})
        </button>
      </div>

      {currentList.length === 0 ? (
        <div className="empty-state" style={{ marginTop: "1rem" }}>
          <div className="empty-icon">{tab === "facturas" ? "🧾" : "📋"}</div>
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
                <button
                  className="btn btn-sm btn-outline btn-download"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Render off-screen, download, then clean up
                    setViewDoc(d);
                    setTimeout(() => {
                      const prefijo = d.tipo === "factura" ? "FACTURA" : "PRESUPUESTO";
                      downloadPdf(`${prefijo}-${d.numero || "SIN-NUMERO"}.pdf`);
                    }, 500);
                  }}
                >
                  📥 Descargar PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Config ─────────────────────────────────────────────
function Config ({ company, setCompany }) {
  const upd = (field, val) => setCompany((c) => ({ ...c, [field]: val }));
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
              <input className="form-input" placeholder="ALB-001" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
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

  const addDoc = (doc) => {
    setDocs((prev) => [...prev, doc]);
    setView("dashboard");
  };

  const content = {
    dashboard: <Dashboard docs={docs} company={company} />,
    "nueva-factura": <DocForm key="factura" tipo="factura" onSave={addDoc} company={company} catalogo={catalogo} />,
    "nuevo-presupuesto": <DocForm key="presupuesto" tipo="presupuesto" onSave={addDoc} company={company} catalogo={catalogo} />,
    catalogo: <Catalogo catalogo={catalogo} setCatalogo={setCatalogo} />,
    historial: <Historial docs={docs} company={company} />,
    config: <Config company={company} setCompany={setCompany} />,
  };

  return (
    <div className="app-layout">
      <Sidebar
        view={view}
        setView={setView}
        counts={{
          facturas: docs.filter((d) => d.tipo === "factura").length,
          presupuestos: docs.filter((d) => d.tipo === "presupuesto").length,
        }}
      />
      <main className="main-content">{content[view]}</main>
    </div>
  );
}
