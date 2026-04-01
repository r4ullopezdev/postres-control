'use client';

import { useEffect, useState } from 'react';
import {
  Dessert, Batch,
  totalQuantity, getDaysUntilExpiration,
  getDessertAlertLevel, getBatchAlertLevel, getUrgentBatch, sellFromBatches,
} from '../lib/types';
import { loadInventory, saveInventory, shouldSendNotification, markNotificationSent } from '../lib/storage';

const PASSWORD = 'Prontopost2026!';
type ModalType = 'none' | 'auth' | 'sell' | 'addStock' | 'addNew';

export default function Dashboard() {
  const [inventory, setInventory] = useState<Dessert[]>([]);
  const [modal, setModal] = useState<ModalType>('none');
  const [pendingAction, setPendingAction] = useState<ModalType>('none');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [emailStatus, setEmailStatus] = useState('');

  // Sell state
  const [sellQty, setSellQty] = useState(1);

  // Add stock state
  const [addQty, setAddQty] = useState(1);
  const [addExpDate, setAddExpDate] = useState('');

  // New product state
  const [newProduct, setNewProduct] = useState({ name: '', quantity: 1, expirationDate: '' });

  useEffect(() => {
    const data = loadInventory();
    setInventory(data);
    checkAndSendNotifications(data);
  }, []);

  const checkAndSendNotifications = async (data: Dessert[]) => {
    const dangerItems = data.filter(d => totalQuantity(d) > 0 && getDessertAlertLevel(d) === 'danger');
    const warningItems = data.filter(d => totalQuantity(d) > 0 && getDessertAlertLevel(d) === 'warning');

    if (dangerItems.length > 0 && shouldSendNotification('danger')) {
      try {
        await fetch('/api/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: 'danger', items: dangerItems }),
        });
        markNotificationSent('danger');
        setEmailStatus('Alerta urgente enviada por email');
        setTimeout(() => setEmailStatus(''), 5000);
      } catch {}
    } else if (warningItems.length > 0 && shouldSendNotification('warning')) {
      try {
        await fetch('/api/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: 'warning', items: warningItems }),
        });
        markNotificationSent('warning');
        setEmailStatus('Aviso de caducidad enviado por email');
        setTimeout(() => setEmailStatus(''), 5000);
      } catch {}
    }
  };

  const updateInventory = (data: Dessert[]) => {
    setInventory(data);
    saveInventory(data);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const openAuthModal = (action: ModalType, id?: string) => {
    setPassword('');
    setPasswordError(false);
    setPendingAction(action);
    if (id) setSelectedId(id);
    setModal('auth');
  };

  const handleAuth = () => {
    if (password !== PASSWORD) { setPasswordError(true); return; }
    const action = pendingAction;
    setModal(action);
    setPassword('');
    setPasswordError(false);
    if (action === 'sell') setSellQty(1);
    if (action === 'addStock') { setAddQty(1); setAddExpDate(''); }
    if (action === 'addNew') setNewProduct({ name: '', quantity: 1, expirationDate: '' });
  };

  const handleSell = () => {
    const updated = inventory.map(d =>
      d.id === selectedId ? sellFromBatches(d, sellQty) : d
    );
    updateInventory(updated);
    setModal('none');
    const item = inventory.find(d => d.id === selectedId);
    showSuccess(`Vendido: ${sellQty} × ${item?.name}`);
  };

  const handleAddStock = () => {
    if (!addExpDate) return;
    const updated = inventory.map(d => {
      if (d.id !== selectedId) return d;
      const existingBatch = d.batches.find(b => b.expirationDate === addExpDate);
      if (existingBatch) {
        return {
          ...d,
          batches: d.batches.map(b =>
            b.expirationDate === addExpDate ? { ...b, quantity: b.quantity + addQty } : b
          ),
        };
      }
      const newBatch: Batch = {
        id: Date.now().toString(),
        quantity: addQty,
        expirationDate: addExpDate,
        createdAt: new Date().toISOString(),
      };
      return { ...d, batches: [...d.batches, newBatch] };
    });
    updateInventory(updated);
    setModal('none');
    const item = inventory.find(d => d.id === selectedId);
    showSuccess(`Añadido: ${addQty} × ${item?.name} (caduca ${formatDate(addExpDate)})`);
  };

  const handleAddNew = () => {
    if (!newProduct.name.trim() || !newProduct.expirationDate) return;
    const newItem: Dessert = {
      id: Date.now().toString(),
      name: newProduct.name.trim(),
      unit: 'paq de 1 und',
      batches: [{
        id: Date.now().toString() + '1',
        quantity: newProduct.quantity,
        expirationDate: newProduct.expirationDate,
        createdAt: new Date().toISOString(),
      }],
    };
    updateInventory([...inventory, newItem]);
    setModal('none');
    showSuccess(`Producto creado: ${newItem.name}`);
  };

  const closeModal = () => { setModal('none'); setPassword(''); setPasswordError(false); };

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

  const selectedItem = inventory.find(d => d.id === selectedId);
  const dangerItems = inventory.filter(d => totalQuantity(d) > 0 && getDessertAlertLevel(d) === 'danger');
  const warningItems = inventory.filter(d => totalQuantity(d) > 0 && getDessertAlertLevel(d) === 'warning');
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <header className="bg-white shadow-sm border-b border-amber-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-800">🍰 Control de Postres</h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">{today}</p>
          </div>
          <button
            onClick={() => openAuthModal('addNew')}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            + Nuevo producto
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {emailStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-800 text-sm flex items-center gap-2">
            📧 {emailStatus}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm flex items-center gap-2">
            ✅ {successMsg}
          </div>
        )}

        {/* DANGER alert */}
        {dangerItems.length > 0 && (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-bold text-red-700">URGENTE: Postres que caducan en menos de 3 días</p>
                <p className="text-red-600 text-sm mt-1">Considera regalarlos a cambio de publicidad.</p>
                <ul className="mt-2 space-y-1">
                  {dangerItems.map(d => {
                    const b = getUrgentBatch(d);
                    if (!b) return null;
                    const days = getDaysUntilExpiration(b.expirationDate);
                    return (
                      <li key={d.id} className="text-red-700 font-medium text-sm">
                        • {d.name} — {totalQuantity(d)} uds — {days <= 0 ? 'CADUCADO' : days === 0 ? 'caduca HOY' : `caduca en ${days} día${days === 1 ? '' : 's'}`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* WARNING alert */}
        {warningItems.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-orange-700">Postres próximos a caducar (menos de 5 días)</p>
                <ul className="mt-2 space-y-1">
                  {warningItems.map(d => {
                    const b = getUrgentBatch(d);
                    if (!b) return null;
                    const days = getDaysUntilExpiration(b.expirationDate);
                    return (
                      <li key={d.id} className="text-orange-700 text-sm">
                        • {d.name} — {totalQuantity(d)} uds — caduca en {days} día{days === 1 ? '' : 's'}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Inventory table */}
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Inventario</h2>
            <span className="text-xs text-gray-400">{inventory.length} productos</span>
          </div>
          <div className="divide-y divide-gray-50">
            {inventory.map(dessert => {
              const level = getDessertAlertLevel(dessert);
              const urgentBatch = getUrgentBatch(dessert);
              const total = totalQuantity(dessert);
              const activeBatches = dessert.batches.filter(b => b.quantity > 0);
              const isExpanded = expandedId === dessert.id;
              const rowBg = level === 'danger' ? 'bg-red-50' : level === 'warning' ? 'bg-orange-50' : '';

              return (
                <div key={dessert.id} className={rowBg}>
                  {/* Main row */}
                  <div className="flex items-center px-6 py-4 gap-4">
                    {/* Name + expand toggle */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{dessert.name}</span>
                        {activeBatches.length > 1 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : dessert.id)}
                            className="inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium transition-colors"
                          >
                            {activeBatches.length} lotes {isExpanded ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{dessert.unit}</span>
                    </div>

                    {/* Stock */}
                    <div className="text-center w-16">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg
                        ${total === 0 ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-800'}`}>
                        {total}
                      </span>
                    </div>

                    {/* Expiry */}
                    <div className="text-center w-32">
                      {urgentBatch ? (
                        <>
                          <span className="text-sm text-gray-600">{formatDate(urgentBatch.expirationDate)}</span>
                          <div className="text-xs mt-0.5">
                            {(() => {
                              const days = getDaysUntilExpiration(urgentBatch.expirationDate);
                              if (days < 0) return <span className="text-red-600 font-bold">Caducado</span>;
                              if (days === 0) return <span className="text-red-600 font-bold">HOY</span>;
                              return <span className={level === 'danger' ? 'text-red-500' : level === 'warning' ? 'text-orange-500' : 'text-gray-400'}>en {days}d</span>;
                            })()}
                          </div>
                        </>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </div>

                    {/* Badge */}
                    <div className="w-24 text-center">
                      {level === 'danger' ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">🚨 Urgente</span>
                      ) : level === 'warning' ? (
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">⚠️ Aviso</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">✓ OK</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAuthModal('sell', dessert.id)}
                        disabled={total === 0}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Vender
                      </button>
                      <button
                        onClick={() => openAuthModal('addStock', dessert.id)}
                        className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                      >
                        Añadir
                      </button>
                    </div>
                  </div>

                  {/* Expanded batches */}
                  {isExpanded && (
                    <div className="px-6 pb-4">
                      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lotes en stock</div>
                        {dessert.batches
                          .filter(b => b.quantity > 0)
                          .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
                          .map((batch, i) => {
                            const bl = getBatchAlertLevel(batch.expirationDate);
                            const days = getDaysUntilExpiration(batch.expirationDate);
                            return (
                              <div key={batch.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                                <div className="flex items-center gap-3">
                                  <span className={`w-2 h-2 rounded-full ${bl === 'danger' ? 'bg-red-500' : bl === 'warning' ? 'bg-orange-400' : 'bg-green-400'}`} />
                                  <span className="text-sm text-gray-700">{formatDate(batch.expirationDate)}</span>
                                  <span className="text-xs text-gray-400">
                                    {days < 0 ? 'Caducado' : days === 0 ? 'Caduca HOY' : `en ${days} día${days === 1 ? '' : 's'}`}
                                  </span>
                                </div>
                                <span className="font-medium text-amber-700">{batch.quantity} uds</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-amber-100 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-700">{inventory.reduce((s, d) => s + totalQuantity(d), 0)}</div>
            <div className="text-xs text-gray-500 mt-1">Total en stock</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-orange-100 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{warningItems.length}</div>
            <div className="text-xs text-gray-500 mt-1">Aviso &lt;5 días</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 text-center shadow-sm">
            <div className="text-2xl font-bold text-red-600">{dangerItems.length}</div>
            <div className="text-xs text-gray-500 mt-1">Urgentes &lt;3 días</div>
          </div>
        </div>
      </main>

      {/* ===== MODALS ===== */}

      {/* Auth */}
      {modal === 'auth' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Acceso protegido</h3>
            <p className="text-sm text-gray-500 mb-4">Introduce la clave para continuar</p>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              placeholder="Contraseña"
              autoFocus
              className={`w-full border ${passwordError ? 'border-red-400 bg-red-50' : 'border-gray-200'} rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400`}
            />
            {passwordError && <p className="text-red-500 text-sm mt-2">Contraseña incorrecta</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAuth} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-medium">Entrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Sell */}
      {modal === 'sell' && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Registrar venta</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedItem.name}</p>
            <div className="bg-amber-50 rounded-xl p-4 mb-4 text-center">
              <p className="text-xs text-gray-500">Stock total</p>
              <p className="text-3xl font-bold text-amber-700">{totalQuantity(selectedItem)}</p>
              {selectedItem.batches.filter(b => b.quantity > 0).length > 1 && (
                <p className="text-xs text-gray-400 mt-1">Se descuenta del lote más antiguo primero</p>
              )}
            </div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Unidades vendidas</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setSellQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">−</button>
              <input type="number" min={1} max={totalQuantity(selectedItem)} value={sellQty}
                onChange={e => setSellQty(Math.min(totalQuantity(selectedItem), Math.max(1, parseInt(e.target.value) || 1)))}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button onClick={() => setSellQty(q => Math.min(totalQuantity(selectedItem), q + 1))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">+</button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Quedará: {totalQuantity(selectedItem) - sellQty} uds</p>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSell} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium">Confirmar venta</button>
            </div>
          </div>
        </div>
      )}

      {/* Add stock */}
      {modal === 'addStock' && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Añadir stock</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedItem.name}</p>

            {/* Existing batches */}
            {selectedItem.batches.filter(b => b.quantity > 0).length > 0 && (
              <div className="mb-4 bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Lotes actuales</p>
                {selectedItem.batches
                  .filter(b => b.quantity > 0)
                  .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate))
                  .map(b => (
                    <div key={b.id} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">{formatDate(b.expirationDate)}</span>
                      <span className="font-medium text-amber-700">{b.quantity} uds</span>
                    </div>
                  ))}
              </div>
            )}

            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fecha de caducidad del nuevo lote *</label>
            <input
              type="date"
              value={addExpDate}
              onChange={e => setAddExpDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4"
            />
            {addExpDate && selectedItem.batches.find(b => b.expirationDate === addExpDate) && (
              <p className="text-amber-600 text-xs -mt-3 mb-3">Se añadirá al lote existente con esta fecha</p>
            )}

            <label className="text-sm font-medium text-gray-700 mb-2 block">Unidades a añadir</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setAddQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">−</button>
              <input type="number" min={1} value={addQty}
                onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button onClick={() => setAddQty(q => q + 1)} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">+</button>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50">Cancelar</button>
              <button
                onClick={handleAddStock}
                disabled={!addExpDate}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New product */}
      {modal === 'addNew' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo producto</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nombre del postre *</label>
                <input type="text" value={newProduct.name}
                  onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Tarta de zanahoria"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Cantidad inicial *</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setNewProduct(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">−</button>
                  <input type="number" min={1} value={newProduct.quantity}
                    onChange={e => setNewProduct(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button onClick={() => setNewProduct(p => ({ ...p, quantity: p.quantity + 1 }))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold">+</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fecha de caducidad *</label>
                <input type="date" value={newProduct.expirationDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setNewProduct(p => ({ ...p, expirationDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                {!newProduct.expirationDate && (
                  <p className="text-orange-500 text-xs mt-1">Obligatorio</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50">Cancelar</button>
              <button
                onClick={handleAddNew}
                disabled={!newProduct.name.trim() || !newProduct.expirationDate}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium"
              >
                Crear producto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
