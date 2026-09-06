'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Gol = {
  id: number;
  minuto: number;
  minuto_extra: number | null;
  tipo: string;
  asistente_id: number | null;
  shot_x: number | null;
  shot_y: number | null;
  goal_x: number | null;
  goal_y: number | null;
  parte_cuerpo: string | null;
  tipo_jugada: string | null;
  tipo_remate: string | null;
  confianza: string | null;
  fuente_video_url: string | null;
  notas: string | null;
  contacto_marco: string | null;
  autor: { id: number; nombre_mostrado: string; slug: string } | null;
  partido: {
    id: number;
    slug: string;
    fecha: string;
    goles_local: number;
    goles_visitante: number;
    equipo_local_id: number;
    equipo_visitante_id: number;
    equipo_local: { nombre_corto: string } | null;
    equipo_visitante: { nombre_corto: string } | null;
  } | null;
};

const PARTES_CUERPO = [
  { v: 'PIE_DERECHO', l: 'Pie derecho' },
  { v: 'PIE_IZQUIERDO', l: 'Pie izquierdo' },
  { v: 'CABEZA', l: 'Cabeza' },
  { v: 'OTRO', l: 'Otro' },
];
const TIPOS_JUGADA = [
  { v: 'ABIERTA', l: 'Jugada abierta' },
  { v: 'CONTRAATAQUE', l: 'Contraataque' },
  { v: 'CORNER', l: 'Córner' },
  { v: 'FALTA', l: 'Falta' },
  { v: 'PENALTI', l: 'Penalti' },
  { v: 'RECHACE', l: 'Rechace' },
  { v: 'SAQUE_BANDA', l: 'Saque de banda' },
];
const TIPOS_REMATE = [
  { v: 'PRIMER_TOQUE', l: 'Primer toque' },
  { v: 'TRAS_CONTROL', l: 'Tras control' },
  { v: 'CONDUCCION', l: 'Conducción' },
  { v: 'VOLEA', l: 'Volea' },
  { v: 'MEDIA_VOLEA', l: 'Media volea' },
  { v: 'CHILENA', l: 'Chilena' },
  { v: 'VASELINA', l: 'Vaselina' },
  { v: 'CABEZAZO', l: 'Cabezazo' },
];
const CONFIANZAS = [
  { v: 'EXACTA', l: 'Exacta' },
  { v: 'APROXIMADA', l: 'Aproximada' },
  { v: 'PARCIAL', l: 'Parcial' },
];
const CONTACTOS_MARCO = [
  { v: 'NINGUNO', l: 'Ninguno' },
  { v: 'POSTE', l: 'Poste' },
  { v: 'LARGUERO', l: 'Larguero' },
];

// Punto de penalti y "D" de referencia, calculados una vez con la geometría
// del área (borde exterior en x=83, línea de meta en x=99, radio ~9 unidades
// igual que el círculo central). offsetX permite reutilizar el dibujo tanto
// en el campo completo como en el recorte de zoom, que solo desplaza el origen.
function AreaReferencias({ offsetX = 0 }: { offsetX?: number }) {
  const penaltyX = 88.3 - offsetX;
  const cy = 32;
  const r = 9;
  const edgeX = 83 - offsetX;
  const dx = penaltyX - edgeX;
  const dy = Math.sqrt(Math.max(r * r - dx * dx, 0));
  return (
    <g stroke="#B9CABE" strokeWidth="0.4" fill="none">
      <circle cx={penaltyX} cy={cy} r="0.6" fill="#B9CABE" stroke="none" />
      <path d={`M ${edgeX} ${cy - dy} A ${r} ${r} 0 0 1 ${edgeX} ${cy + dy}`} />
    </g>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const loc = pt.matrixTransform(ctm.inverse());
  return { x: loc.x, y: loc.y };
}

function fechaCorta(fecha: string) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GolesAdminClient({ golesIniciales }: { golesIniciales: Gol[] }) {
  const [cola, setCola] = useState(golesIniciales);
  const [idx, setIdx] = useState(0);
  const gol = cola[idx];

  const [shot, setShot] = useState<{ x: number; y: number } | null>(null);
  const [goal, setGoal] = useState<{ x: number; y: number } | null>(null);
  const [parteCuerpo, setParteCuerpo] = useState<string | null>(null);
  const [tipoJugada, setTipoJugada] = useState<string | null>(null);
  const [tipoRemate, setTipoRemate] = useState<string | null>(null);
  const [confianza, setConfianza] = useState<string | null>(null);
  const [contactoMarco, setContactoMarco] = useState<string | null>(null);
  const [fuenteVideo, setFuenteVideo] = useState('');
  const [notas, setNotas] = useState('');
  const [asistenteQuery, setAsistenteQuery] = useState('');
  const [asistenteSel, setAsistenteSel] = useState<{ id: number; nombre_mostrado: string } | null>(null);
  const [sugerencias, setSugerencias] = useState<{ id: number; nombre_mostrado: string }[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const pitchRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<SVGSVGElement>(null);
  const goalRef = useRef<SVGSVGElement>(null);
  const ZOOM_MIN_X = 75; // último cuarto de campo, donde se marca la mayoría de goles

  function limpiarCampos() {
    setShot(null);
    setGoal(null);
    setParteCuerpo(null);
    setTipoJugada(null);
    setTipoRemate(null);
    setConfianza(null);
    setContactoMarco(null);
    setFuenteVideo('');
    setNotas('');
    setAsistenteQuery('');
    setAsistenteSel(null);
    setSugerencias([]);
  }

  function handlePitchPointer(e: React.PointerEvent<SVGSVGElement>) {
    const svg = pitchRef.current;
    if (!svg) return;
    const p = svgPoint(svg, e.clientX, e.clientY);
    const x = clamp(p.x, 0, 100);
    const y = clamp(p.y, 0, 64);
    setShot({ x, y: (y / 64) * 100 });
  }

  function handleZoomPointer(e: React.PointerEvent<SVGSVGElement>) {
    const svg = zoomRef.current;
    if (!svg) return;
    const p = svgPoint(svg, e.clientX, e.clientY);
    const x = clamp(ZOOM_MIN_X + p.x, 0, 100);
    const y = clamp(p.y, 0, 64);
    setShot({ x, y: (y / 64) * 100 });
  }

  function handleGoalPointer(e: React.PointerEvent<SVGSVGElement>) {
    const svg = goalRef.current;
    if (!svg) return;
    const p = svgPoint(svg, e.clientX, e.clientY);
    const px = clamp(p.x, 0, 100);
    const py = clamp(p.y, 0, 100);
    setGoal({ x: px, y: 100 - py });
  }

  async function buscarAsistente(q: string) {
    setAsistenteQuery(q);
    setAsistenteSel(null);
    if (q.length < 2) {
      setSugerencias([]);
      return;
    }
    const { data } = await supabase.from('personas').select('id, nombre_mostrado').ilike('nombre_mostrado', `%${q}%`).limit(8);
    setSugerencias(data ?? []);
  }

  async function guardarYSiguiente() {
    if (!gol) return;
    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase.rpc('admin_actualizar_gol', {
      p_gol_id: gol.id,
      p_asistente_id: asistenteSel?.id ?? null,
      p_parte_cuerpo: parteCuerpo,
      p_tipo_jugada: tipoJugada,
      p_tipo_remate: tipoRemate,
      p_shot_x: shot?.x ?? null,
      p_shot_y: shot?.y ?? null,
      p_goal_x: goal?.x ?? null,
      p_goal_y: goal?.y ?? null,
      p_confianza: confianza,
      p_fuente_video_url: fuenteVideo || null,
      p_notas: notas || null,
      p_contacto_marco: contactoMarco,
    });
    setGuardando(false);
    if (error) {
      setMensaje('Error al guardar: ' + error.message);
      return;
    }
    const nuevaCola = cola.filter((g) => g.id !== gol.id);
    setCola(nuevaCola);
    setIdx(0);
    limpiarCampos();
    setMensaje('Gol guardado ✓');
    setTimeout(() => setMensaje(null), 2000);
  }

  const resumenPartido = useMemo(() => {
    if (!gol?.partido) return null;
    const p = gol.partido;
    const cordobaEsLocal = p.equipo_local_id === 74;
    const rival = cordobaEsLocal ? p.equipo_visitante?.nombre_corto : p.equipo_local?.nombre_corto;
    return { rival, marcador: `${p.goles_local}-${p.goles_visitante}`, fecha: fechaCorta(p.fecha), slug: p.slug };
  }, [gol]);

  if (!gol) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <h1 className="font-serif text-2xl font-bold text-blanquiverde-verde mb-3">Catalogación de goles</h1>
        <p className="text-gray-500">No quedan goles pendientes en esta tanda. Recarga la página para traer más.</p>
      </div>
    );
  }

  function BtnGroup({
    opciones,
    valor,
    onChange,
  }: {
    opciones: { v: string; l: string }[];
    valor: string | null;
    onChange: (v: string) => void;
  }) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {opciones.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`px-3 py-1.5 rounded text-xs border ${
              valor === o.v
                ? 'bg-blanquiverde-verde border-blanquiverde-verde text-white'
                : 'border-gray-300 text-gray-600 hover:border-blanquiverde-verde'
            }`}
          >
            {o.l}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl font-bold text-blanquiverde-verde">Catalogación de goles</h1>
        <span className="font-mono text-sm text-gray-400">{cola.length} pendientes en esta tanda</span>
      </div>

      {resumenPartido && (
        <div className="border rounded-lg p-4 mb-6 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <Link href={`/partidos/${resumenPartido.slug}`} className="font-serif text-lg hover:underline" target="_blank">
              Córdoba {resumenPartido.marcador} {resumenPartido.rival}
            </Link>
            <div className="text-xs text-gray-500 font-mono">{resumenPartido.fecha}</div>
          </div>
          <div className="text-sm">
            <span className="font-medium">{gol.autor?.nombre_mostrado ?? '?'}</span>{' '}
            <span className="text-gray-400 font-mono">
              {gol.minuto}
              {gol.minuto_extra ? `+${gol.minuto_extra}` : ''}' · {gol.tipo}
            </span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Punto de disparo</label>
            <span className="font-mono text-xs text-blanquiverde-verde bg-blanquiverde-verde/10 px-2 py-0.5 rounded">
              {shot ? `x: ${shot.x.toFixed(1)} · y: ${shot.y.toFixed(1)}` : 'x: — · y: —'}
            </span>
          </div>
          <svg
            ref={pitchRef}
            viewBox="0 0 100 64"
            className="w-full bg-blanquiverde-verde/5 border border-blanquiverde-verde/30 rounded cursor-crosshair touch-none"
            onPointerDown={handlePitchPointer}
            onPointerMove={(e) => e.buttons === 1 && handlePitchPointer(e)}
          >
            <rect x="1" y="1" width="98" height="62" fill="none" stroke="#B9CABE" strokeWidth="0.4" />
            <line x1="50" y1="1" x2="50" y2="63" stroke="#B9CABE" strokeWidth="0.4" />
            <circle cx="50" cy="32" r="9" fill="none" stroke="#B9CABE" strokeWidth="0.4" />
            <rect x="1" y="14" width="16" height="36" fill="none" stroke="#B9CABE" strokeWidth="0.4" />
            <rect x="83" y="14" width="16" height="36" fill="none" stroke="#B9CABE" strokeWidth="0.4" />
            <AreaReferencias />
            {/* Marco visual del recorte de zoom (último cuarto) */}
            <rect x={ZOOM_MIN_X} y="1" width={99 - ZOOM_MIN_X} height="62" fill="none" stroke="#A9813C" strokeWidth="0.5" strokeDasharray="1.5,1" />
            <text x="4" y="60" fontSize="3" fill="#8B958C">
              Córdoba ataca →
            </text>
            {shot && <circle cx={shot.x} cy={(shot.y / 100) * 64} r="1.8" fill="#A9813C" stroke="#fff" strokeWidth="0.5" />}
          </svg>

          <div className="flex items-center justify-between mb-1 mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Zoom último cuarto <span className="normal-case text-gray-400 font-normal">arrastra para precisar</span>
            </label>
          </div>
          <svg
            ref={zoomRef}
            viewBox={`0 0 ${100 - ZOOM_MIN_X} 64`}
            className="w-full bg-blanquiverde-verde/5 border border-[#A9813C]/50 rounded cursor-crosshair touch-none"
            onPointerDown={handleZoomPointer}
            onPointerMove={(e) => e.buttons === 1 && handleZoomPointer(e)}
          >
            <rect x="-1" y="1" width={100 - ZOOM_MIN_X + 1} height="62" fill="none" stroke="#B9CABE" strokeWidth="0.4" />
            <rect x={83 - ZOOM_MIN_X} y="14" width="16" height="36" fill="none" stroke="#B9CABE" strokeWidth="0.4" />
            <AreaReferencias offsetX={ZOOM_MIN_X} />
            {shot && (
              <circle cx={shot.x - ZOOM_MIN_X} cy={(shot.y / 100) * 64} r="2.4" fill="#A9813C" stroke="#fff" strokeWidth="0.6" />
            )}
          </svg>

          <div className="flex items-center justify-between mb-1 mt-5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Entrada a portería</label>
            <span className="font-mono text-xs text-blanquiverde-verde bg-blanquiverde-verde/10 px-2 py-0.5 rounded">
              {goal ? `x: ${goal.x.toFixed(1)} · y: ${goal.y.toFixed(1)}` : 'x: — · y: —'}
            </span>
          </div>
          <svg
            ref={goalRef}
            viewBox="0 0 100 100"
            className="w-full max-w-[260px] mx-auto block bg-blanquiverde-verde/5 border border-blanquiverde-verde/30 rounded cursor-crosshair touch-none"
            onPointerDown={handleGoalPointer}
            onPointerMove={(e) => e.buttons === 1 && handleGoalPointer(e)}
          >
            <rect x="12" y="10" width="76" height="62" fill="none" stroke="#8B958C" strokeWidth="2" />
            {[20, 28, 36, 44, 52, 60, 68, 76].map((x) => (
              <line key={x} x1={x} y1="10" x2={x} y2="72" stroke="#CBD1C8" strokeWidth="0.4" />
            ))}
            {[20, 30, 40, 50, 60].map((y) => (
              <line key={y} x1="12" y1={y} x2="88" y2={y} stroke="#CBD1C8" strokeWidth="0.4" />
            ))}
            <line x1="0" y1="72" x2="100" y2="72" stroke="#B9CABE" strokeWidth="1.4" />
            {goal && <circle cx={goal.x} cy={100 - goal.y} r="3" fill="#0E5A38" stroke="#fff" strokeWidth="1.4" />}
          </svg>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Parte del cuerpo</label>
            <BtnGroup opciones={PARTES_CUERPO} valor={parteCuerpo} onChange={setParteCuerpo} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo de jugada</label>
            <BtnGroup opciones={TIPOS_JUGADA} valor={tipoJugada} onChange={setTipoJugada} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo de remate</label>
            <BtnGroup opciones={TIPOS_REMATE} valor={tipoRemate} onChange={setTipoRemate} />
          </div>
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Asistente</label>
            {asistenteSel ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-blanquiverde-verde/10 px-2 py-1 rounded">{asistenteSel.nombre_mostrado}</span>
                <button type="button" className="text-xs text-gray-400 hover:text-gray-700" onClick={() => setAsistenteSel(null)}>
                  quitar
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={asistenteQuery}
                  onChange={(e) => buscarAsistente(e.target.value)}
                  placeholder="Buscar jugador…"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blanquiverde-verde"
                />
                {sugerencias.length > 0 && (
                  <ul className="absolute z-10 bg-white border rounded mt-1 w-full shadow-md max-h-48 overflow-y-auto">
                    {sugerencias.map((s) => (
                      <li
                        key={s.id}
                        className="px-3 py-2 text-sm hover:bg-blanquiverde-verde/10 cursor-pointer"
                        onClick={() => {
                          setAsistenteSel(s);
                          setSugerencias([]);
                        }}
                      >
                        {s.nombre_mostrado}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confianza del análisis</label>
            <BtnGroup opciones={CONFIANZAS} valor={confianza} onChange={setConfianza} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">¿Pegó en palo o larguero?</label>
            <BtnGroup opciones={CONTACTOS_MARCO} valor={contactoMarco} onChange={setContactoMarco} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Fuente de vídeo (URL)</label>
            <input
              type="text"
              value={fuenteVideo}
              onChange={(e) => setFuenteVideo(e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blanquiverde-verde"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones sobre la jugada…"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:border-blanquiverde-verde"
            />
          </div>

          <button
            type="button"
            onClick={guardarYSiguiente}
            disabled={guardando}
            className="w-full bg-blanquiverde-verde text-white rounded-lg py-3 font-medium hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar y siguiente'}
          </button>
          {mensaje && <p className="text-center text-sm text-gray-600">{mensaje}</p>}
        </div>
      </div>
    </div>
  );
}
