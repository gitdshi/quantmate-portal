interface Tab {
  key: string
  label: string
  icon?: React.ReactNode
}

interface TabPanelProps {
  tabs: Tab[]
  activeTab: string
  onChange: (key: string) => void
  children: React.ReactNode
}

export default function TabPanel({ tabs, activeTab, onChange, children }: TabPanelProps) {
  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  )
}
