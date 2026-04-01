'use client';

import { useEffect, useState, useCallback } from 'react';
import { Dessert, getDaysUntilExpiration, getAlertLevel } from '../lib/types';
import { loadInventory, saveInventory, shouldSendNotification, markNotificationSent } from '../lib/storage';

const PASSWORD = 'Prontopost2026!';

type ModalType = 'none' | 'auth' | 'sell' | 'add' | 'addNew';

export default function Dashboard() {
  const [inventory, setInventory] = useState<Dessert[]>([]);
  const [modal, setModal] = useState<ModalType>('none');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [pendingAction, setPendingAction] = useState<ModalType>('none');
  const [sellQty, setSellQty] = useState(1);
  const [addQty, setAddQty] = useState(1);
  const [newProduct, setNewProduct] = useState({ name: '', quantity: 1, expirationDate: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [emailStatus, setEmailStatus] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Load inventory and check notifications on mount
  useEffect(() => {
    const data = loadInventory();
    setInventory(data);
    checkAndSendNotifications(data);
  }, []);

  const checkAndSendNotifications = async (data: Dessert[]) => {
    const dangerItems = data.filter(d => d.quantity > 0 && getAlertLevel(d.expirationDate) === 'danger');
    const warningItems = data.filter(d => d.quantity > 0 && getAlertLevel(d.expirationDate) === 'warning');

    if (dangerItems.length > 0 && shouldSendNotification('danger')) {
      try {
        await fetch('/api/send-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: 'danger', items: dangerItems }),
        });
        markNotificationSent('danger');
        setEmailStatus('Alerta de caducidad enviada por email');
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
        setEmailStatus('Aviso de próxima caducidad enviado por email');
        setTimeout(() => setEmailStatus(''), 5000);
      } catch {}
    }
  };

  const updateInventory = (data: Dessert[]) => {
    setInventory(data);
    saveInventory(data);
  };

  const openAuthModal = (action: ModalType, id?: string) => {
    setPassword('');
    setPasswordError(false);
    setPendingAction(action);
    if (id) setSelectedId(id);
    setModal('auth');
  };

  const handleAuth = () => {
    if (password !== PASSWORD) {
      setPasswordError(true);
      return;
    }
    setModal(pendingAction);
    setPassword('');
    setPasswordError(false);
    if (pendingAction === 'sell') setSellQty(1);
    if (pendingAction === 'add') setAddQty(1);
    if (pendingAction === 'addNew') setNewProduct({ name: '', quantity: 1, expirationDate: '' });
  };

  const handleSell = () => {
    const updated = inventory.map(d => {
      if (d.id !== selectedId) return d;
      return { ...d, quantity: Math.max(0, d.quantity - sellQty) };
    });
    updateInventory(updated);
    setModal('none');
    const item = inventory.find(d => d.id === selectedId);
    showSuccess(`Vendido: ${sellQty} x ${item?.name}`);
  };

  const handleAdd = () => {
    const updated = inventory.map(d => {
      if (d.id !== selectedId) return d;
      return { ...d, quantity: d.quantity + addQty };
    });
    updateInventory(updated);
    setModal('none');
    const item = inventory.find(d => d.id === selectedId);
    showSuccess(`Añadido: ${addQty} x ${item?.name}`);
  };

  const handleAddNew = () => {
    if (!newProduct.name.trim() || !newProduct.expirationDate) return;
    const newItem: Dessert = {
      id: Date.now().toString(),
      name: newProduct.name.trim(),
      quantity: newProduct.quantity,
      unit: 'paq de 1 und',
      expirationDate: newProduct.expirationDate,
      createdAt: new Date().toISOString(),
    };
    const updated = [...inventory, newItem];
    updateInventory(updated);
    setModal('none');
    showSuccess(`Producto añadido: ${newItem.name}`);
  };

  const closeModal = () => {
    setModal('none');
    setPassword('');
    setPasswordError(false);
  };

  const warningItems = inventory.filter(d => d.quantity > 0 && getAlertLevel(d.expirationDate) === 'warning');
  const dangerItems = inventory.filter(d => d.quantity > 0 && getAlertLevel(d.expirationDate) === 'danger');
  const selectedItem = inventory.find(d => d.id === selectedId);

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Header */}
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
        {/* Email status */}
        {emailStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-800 text-sm flex items-center gap-2">
            <span>📧</span> {emailStatus}
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm flex items-center gap-2 animate-pulse">
            <span>✅</span> {successMsg}
          </div>
        )}

        {/* DANGER alert — menos de 3 días */}
        {dangerItems.length > 0 && (
          <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-bold text-red-700 text-base">¡URGENTE! Productos que caducan en menos de 3 días</p>
                <p className="text-red-600 text-sm mt-1">Considera regalarlos a cambio de publicidad o hacer alguna promoción.</p>
                <ul className="mt-2 space-y-1">
                  {dangerItems.map(d => {
                    const days = getDaysUntilExpiration(d.expirationDate);
                    return (
                      <li key={d.id} className="text-red-700 font-medium text-sm">
                        • {d.name} — {d.quantity} uds — caduca {days === 0 ? 'HOY' : days < 0 ? `hace ${Math.abs(days)} días` : `en ${days} día${days === 1 ? '' : 's'}`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* WARNING alert — menos de 5 días */}
        {warningItems.length > 0 && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-orange-700 text-base">Productos próximos a caducar (menos de 5 días)</p>
                <ul className="mt-2 space-y-1">
                  {warningItems.map(d => {
                    const days = getDaysUntilExpiration(d.expirationDate);
                    return (
                      <li key={d.id} className="text-orange-700 text-sm">
                        • {d.name} — {d.quantity} uds — caduca en {days} día{days === 1 ? '' : 's'}
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
            <h2 className="font-semibold text-gray-700">Inventario de postres</h2>
            <span className="text-xs text-gray-400">{inventory.length} productos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Caduca</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inventory.map((dessert) => {
                  const level = getAlertLevel(dessert.expirationDate);
                  const days = getDaysUntilExpiration(dessert.expirationDate);
                  const rowBg = level === 'danger' ? 'bg-red-50' : level === 'warning' ? 'bg-orange-50' : '';
                  return (
                    <tr key={dessert.id} className={`${rowBg} hover:bg-gray-50 transition-colors`}>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-800">{dessert.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{dessert.unit}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg
                          ${dessert.quantity === 0 ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-800'}`}>
                          {dessert.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-gray-600">
                          {new Date(dessert.expirationDate + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <div className="text-xs mt-0.5">
                          {days < 0 ? <span className="text-red-600 font-medium">Caducado</span>
                            : days === 0 ? <span className="text-red-600 font-bold">Caduca HOY</span>
                            : <span className={level === 'danger' ? 'text-red-500' : level === 'warning' ? 'text-orange-500' : 'text-gray-400'}>
                                en {days} día{days === 1 ? '' : 's'}
                              </span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {level === 'danger' ? (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                            🚨 Urgente
                          </span>
                        ) : level === 'warning' ? (
                          <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                            ⚠️ Aviso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            ✓ OK
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAuthModal('sell', dessert.id)}
                            disabled={dessert.quantity === 0}
                            className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Vender
                          </button>
                          <button
                            onClick={() => openAuthModal('add', dessert.id)}
                            className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            Añadir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-amber-100 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-700">{inventory.reduce((s, d) => s + d.quantity, 0)}</div>
            <div className="text-xs text-gray-500 mt-1">Total en stock</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-orange-100 text-center shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{warningItems.length}</div>
            <div className="text-xs text-gray-500 mt-1">Con aviso &lt;5 días</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 text-center shadow-sm">
            <div className="text-2xl font-bold text-red-600">{dangerItems.length}</div>
            <div className="text-xs text-gray-500 mt-1">Urgentes &lt;3 días</div>
          </div>
        </div>
      </main>

      {/* ===== MODALS ===== */}

      {/* Auth Modal */}
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
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleAuth} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl font-medium transition-colors">
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {modal === 'sell' && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Registrar venta</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedItem.name}</p>
            <div className="bg-amber-50 rounded-xl p-4 mb-4 text-center">
              <p className="text-xs text-gray-500">Stock actual</p>
              <p className="text-3xl font-bold text-amber-700">{selectedItem.quantity}</p>
            </div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">¿Cuántas unidades se venden?</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setSellQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors">−</button>
              <input
                type="number"
                min={1}
                max={selectedItem.quantity}
                value={sellQty}
                onChange={e => setSellQty(Math.min(selectedItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button onClick={() => setSellQty(q => Math.min(selectedItem.quantity, q + 1))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors">+</button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Quedará: {selectedItem.quantity - sellQty} uds</p>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleSell} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium transition-colors">Confirmar venta</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {modal === 'add' && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Añadir stock</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedItem.name}</p>
            <div className="bg-amber-50 rounded-xl p-4 mb-4 text-center">
              <p className="text-xs text-gray-500">Stock actual</p>
              <p className="text-3xl font-bold text-amber-700">{selectedItem.quantity}</p>
            </div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">¿Cuántas unidades añadir?</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setAddQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors">−</button>
              <input
                type="number"
                min={1}
                value={addQty}
                onChange={e => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button onClick={() => setAddQty(q => q + 1)} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors">+</button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Total: {selectedItem.quantity + addQty} uds</p>
            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleAdd} className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-medium transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {modal === 'addNew' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo producto</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nombre del postre *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Tarta de zanahoria"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Cantidad inicial *</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setNewProduct(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors">−</button>
                  <input
                    type="number"
                    min={1}
                    value={newProduct.quantity}
                    onChange={e => setNewProduct(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-center text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button onClick={() => setNewProduct(p => ({ ...p, quantity: p.quantity + 1 }))} className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors">+</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fecha de caducidad *</label>
                <input
                  type="date"
                  value={newProduct.expirationDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setNewProduct(p => ({ ...p, expirationDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
                {!newProduct.expirationDate && (
                  <p className="text-orange-500 text-xs mt-1">La fecha de caducidad es obligatoria</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button
                onClick={handleAddNew}
                disabled={!newProduct.name.trim() || !newProduct.expirationDate}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-xl font-medium transition-colors"
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
