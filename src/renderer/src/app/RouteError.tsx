import { House, RotateCw, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate, useRouteError } from 'react-router'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { fr } from '@renderer/i18n/fr'

const t = fr.shell.crash

function messageOf(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error).slice(0, 500)
  } catch {
    return String(error)
  }
}

function CrashCard({ withHome }: { withHome: boolean }) {
  const error = useRouteError()
  const navigate = useNavigate()
  useEffect(() => {
    console.error('Screen failed', error)
  }, [error])

  return (
    <Card role="alert" className="mx-auto mt-12 flex w-full max-w-[560px] flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 flex items-center gap-2 text-heading font-semibold text-fg">
          <TriangleAlert size={18} aria-hidden="true" className="shrink-0 text-status-danger" />
          {t.title}
        </h1>
        <p className="m-0 text-body text-fg-secondary">{t.text}</p>
      </div>
      <details className="rounded-field border border-border bg-surface-2 px-3 py-2 text-small text-fg-secondary">
        <summary className="cursor-pointer text-fg">{t.detail}</summary>
        <pre className="m-0 mt-2 font-mono text-caption whitespace-pre-wrap [overflow-wrap:anywhere]">
          {messageOf(error)}
        </pre>
      </details>
      <div className={withHome ? 'grid grid-cols-2 gap-2' : 'flex justify-end'}>
        {withHome ? (
          <Button
            variant="outline"
            icon={<House size={15} aria-hidden="true" />}
            onClick={() => {
              void navigate('/')
            }}
          >
            {t.home}
          </Button>
        ) : null}
        <Button
          icon={<RotateCw size={15} aria-hidden="true" />}
          onClick={() => {
            window.location.reload()
          }}
        >
          {t.reload}
        </Button>
      </div>
    </Card>
  )
}

/** A screen that failed: the shell stays, the sidebar leads elsewhere. */
export function ScreenError() {
  return <CrashCard withHome />
}

/** The shell itself, or a screen outside it (preparation, printing), failed. */
export function AppError() {
  return (
    <div className="flex h-full items-start justify-center overflow-auto p-4">
      <CrashCard withHome={false} />
    </div>
  )
}
