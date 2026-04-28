export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-secondary-200 bg-white px-4 py-6">
      <div className="mb-8">
        <span className="text-lg font-bold text-primary-700">Sistema de Julgamento</span>
      </div>
      <nav aria-label="Menu principal">
        <ul className="flex flex-col gap-1">
          {/* TODO P03: adicionar links de navegação autenticados */}
          <li>
            <span className="block rounded px-3 py-2 text-sm text-secondary-500">
              Dashboard
            </span>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
