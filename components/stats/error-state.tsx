'use client'

import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="p-10 flex flex-col items-center gap-4 text-center">
      <AlertCircle className="w-10 h-10 text-destructive" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Couldn&apos;t load your stats</h2>
        <p className="text-sm text-muted-foreground">
          The export could not be processed. Return to the upload screen and choose the original ZIP.
        </p>
      </div>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RotateCcw className="w-4 h-4" /> Retry
      </Button>
    </Card>
  )
}
