import { useNavigate } from 'react-router-dom';
import { CreditCard, FileText, ReceiptText } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Finance() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar project="finance" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-700">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Finance Hub</h1>
              <p className="text-sm text-muted-foreground">
                Controlled financial documents, payment records, and branded receipt exports.
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background p-6">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Receipt Generator</CardTitle>
                <CardDescription>
                  Create polished, render-safe receipts with PDF, PNG, and JPG exports from the same canonical layout.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      label: 'Locked A4 Layout',
                      copy: 'Preview and export run from the same server-side template.',
                    },
                    {
                      label: 'Document History',
                      copy: 'Every generated file version stays attached to the receipt.',
                    },
                    {
                      label: 'Mandatory Void Reason',
                      copy: 'Issued receipts remain controlled and traceable.',
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border bg-background p-4">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
                    </div>
                  ))}
                </div>

                <Button onClick={() => navigate('/finance/receipts')} className="gap-2">
                  <ReceiptText className="h-4 w-4" />
                  Open Receipt Workspace
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Current Focus</CardTitle>
                <CardDescription>Finance receipt operations shipping in this workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Receipt drafting</p>
                      <p className="text-sm text-muted-foreground">Pool lead linking and finance field snapshots</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold">Export formats</p>
                  <p className="mt-2 text-sm text-muted-foreground">PDF is canonical. PNG and JPG derive from the same render surface.</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold">Auditability</p>
                  <p className="mt-2 text-sm text-muted-foreground">Draft edits, issue, exports, downloads, and void actions remain visible in receipt history.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
