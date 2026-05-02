     1|'use client'
     2|
     3|import { useEffect, useState } from 'react'
     4|import { createClient } from '@/lib/supabase/client'
     5|import { Button } from '@/components/ui/button'
     6|import { Input } from '@/components/ui/input'
     7|import { Modal } from '@/components/ui/modal'
     8|import { Search, Plus, Phone, Mail, MoreHorizontal } from 'lucide-react'
     9|import Link from 'next/link'
    10|import toast from 'react-hot-toast'
    11|import type { Client } from '@/lib/utils'
    12|
    13|function NewClientModal({
    14|  open,
    15|  onClose,
    16|  onCreated,
    17|}: {
    18|  open: boolean
    19|  onClose: () => void
    20|  onCreated: () => void
    21|}) {
    22|  const supabase = createClient()
    23|  const [loading, setLoading] = useState(false)
    24|  const [form, setForm] = useState({
    25|    name: '',
    26|    email: '',
    27|    phone: '',
    28|    address: '',
    29|    notes: '',
    30|  })
    31|
    32|  const handleSubmit = async (e: React.FormEvent) => {
    33|    e.preventDefault()
    34|    setLoading(true)
    35|    const { data: { user } } = await supabase.auth.getUser()
    36|    if (!user) {
    37|      toast.error('Not authenticated')
    38|      setLoading(false)
    39|      return
    40|    }
    41|
    42|    const { error } = await supabase.from('clients').insert({
    43|      user_id: user.id,
    44|      name: form.name,
    45|      email: form.email || null,
    46|      phone: form.phone || null,
    47|      address: form.address || null,
    48|      notes: form.notes || null,
    49|    })
    50|
    51|    setLoading(false)
    52|    if (error) {
    53|      toast.error(error.message)
    54|    } else {
    55|      toast.success('Client created!')
    56|      setForm({ name: '', email: '', phone: '', address: '', notes: '' })
    57|      onCreated()
    58|      onClose()
    59|    }
    60|  }
    61|
    62|  return (
    63|    <Modal open={open} onClose={onClose} title="New Client">
    64|      <form onSubmit={handleSubmit} className="space-y-4">
    65|        <Input
    66|          id="client-name"
    67|          label="Name *"
    68|          placeholder="Client name"
    69|          value={form.name}
    70|          onChange={(e) => setForm({ ...form, name: e.target.value })}
    71|          required
    72|        />
    73|        <Input
    74|          id="client-email"
    75|          label="Email"
    76|          type="email"
    77|          placeholder="client@example.com"
    78|          value={form.email}
    79|          onChange={(e) => setForm({ ...form, email: e.target.value })}
    80|        />
    81|        <Input
    82|          id="client-phone"
    83|          label="Phone"
    84|          placeholder="0400 000 000"
    85|          value={form.phone}
    86|          onChange={(e) => setForm({ ...form, phone: e.target.value })}
    87|        />
    88|        <Input
    89|          id="client-address"
    90|          label="Address"
    91|          placeholder="123 Main St, Sydney NSW 2000"
    92|          value={form.address}
    93|          onChange={(e) => setForm({ ...form, address: e.target.value })}
    94|        />
    95|        <div>
    96|          <label className="mb-1.5 block text-sm font-medium text-muted">Notes</label>
    97|          <textarea
    98|            value={form.notes}
    99|            onChange={(e) => setForm({ ...form, notes: e.target.value })}
   100|            rows={3}
   101|            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
   102|            placeholder="Any notes..."
   103|          />
   104|        </div>
   105|        <div className="flex gap-3 pt-2">
   106|          <Button type="button" variant="secondary" onClick={onClose}>
   107|            Cancel
   108|          </Button>
   109|          <Button type="submit" variant="primary" loading={loading}>
   110|            Create Client
   111|          </Button>
   112|        </div>
   113|      </form>
   114|    </Modal>
   115|  )
   116|}
   117|
   118|export default function ClientsPage() {
   119|  const supabase = createClient()
   120|  const [clients, setClients] = useState<Client[]>([])
   121|  const [search, setSearch] = useState('')
   122|  const [loading, setLoading] = useState(true)
   123|  const [showNewModal, setShowNewModal] = useState(false)
   124|
   125|  const fetchClients = async () => {
   126|    setLoading(true)
   127|    const { data: { user } } = await supabase.auth.getUser()
   128|    if (!user) return
   129|
   130|    let query = supabase
   131|      .from('clients')
   132|      .select('*')
   133|      .eq('user_id', user.id)
   134|      .order('created_at', { ascending: false })
   135|
   136|    if (search.trim()) {
   137|      query = query.ilike('name', `%${search.trim()}%`)
   138|    }
   139|
   140|    const { data } = await query
   141|    if (data) setClients(data as Client[])
   142|    setLoading(false)
   143|  }
   144|
   145|  useEffect(() => {
   146|    fetchClients()
   147|  }, [search])
   148|
   149|  return (
   150|    <div className="space-y-6">
   151|      <div className="flex items-center justify-between">
   152|        <div>
   153|          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
   154|          <p className="mt-1 text-sm text-muted">Manage your client base</p>
   155|        </div>
   156|        <Button onClick={() => setShowNewModal(true)}>
   157|          <Plus className="h-4 w-4" /> New Client
   158|        </Button>
   159|      </div>
   160|
   161|      {/* Search */}
   162|      <div className="relative max-w-md">
   163|        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
   164|        <input
   165|          type="text"
   166|          placeholder="Search clients..."
   167|          value={search}
   168|          onChange={(e) => setSearch(e.target.value)}
   169|          className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
   170|        />
   171|      </div>
   172|
   173|      {/* Clients Table */}
   174|      <div className="overflow-hidden rounded-xl border border-border">
   175|        <table className="w-full">
   176|          <thead>
   177|            <tr className="border-b border-border bg-card">
   178|              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Name</th>
   179|              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden sm:table-cell">Phone</th>
   180|              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider hidden md:table-cell">Email</th>
   181|<<<<<<< HEAD
   182|              <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Status</th>
   183|=======
   184|>>>>>>> cd71cf2 (fix: align all pages with actual DB columns)
   185|              <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Actions</th>
   186|            </tr>
   187|          </thead>
   188|          <tbody className="divide-y divide-border bg-card">
   189|            {loading ? (
   190|              <tr>
   191|                <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted">
   192|                  Loading...
   193|                </td>
   194|              </tr>
   195|            ) : clients.length === 0 ? (
   196|              <tr>
   197|                <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted">
   198|                  No clients found
   199|                </td>
   200|              </tr>
   201|            ) : (
   202|              clients.map((client) => (
   203|                <tr
   204|                  key={client.id}
   205|                  className="transition-colors hover:bg-card-hover"
   206|                >
   207|                  <td className="px-4 py-3">
   208|                    <Link
   209|                      href={`/clients/${client.id}`}
   210|                      className="text-sm font-medium text-foreground hover:text-primary"
   211|                    >
   212|                      {client.name}
   213|                    </Link>
   214|                  </td>
   215|                  <td className="hidden px-4 py-3 text-sm text-muted sm:table-cell">
   216|                    {client.phone ? (
   217|                      <span className="flex items-center gap-1.5">
   218|                        <Phone className="h-3.5 w-3.5" /> {client.phone}
   219|                      </span>
   220|                    ) : (
   221|                      '—'
   222|                    )}
   223|                  </td>
   224|                  <td className="hidden px-4 py-3 text-sm text-muted md:table-cell">
   225|                    {client.email ? (
   226|                      <span className="flex items-center gap-1.5">
   227|                        <Mail className="h-3.5 w-3.5" /> {client.email}
   228|                      </span>
   229|                    ) : (
   230|                      '—'
   231|                    )}
   232|                  </td>
   233|<<<<<<< HEAD
   234|                  <td className="px-4 py-3">
   235|                    <Badge variant="green">
   236|                      active
   237|                    </Badge>
   238|                  </td>
   239|=======
   240|>>>>>>> cd71cf2 (fix: align all pages with actual DB columns)
   241|                  <td className="px-4 py-3 text-right">
   242|                    <Link href={`/clients/${client.id}`}>
   243|                      <Button variant="ghost" size="sm">
   244|                        <MoreHorizontal className="h-4 w-4" />
   245|                      </Button>
   246|                    </Link>
   247|                  </td>
   248|                </tr>
   249|              ))
   250|            )}
   251|          </tbody>
   252|        </table>
   253|      </div>
   254|
   255|      <NewClientModal
   256|        open={showNewModal}
   257|        onClose={() => setShowNewModal(false)}
   258|        onCreated={fetchClients}
   259|      />
   260|    </div>
   261|  )
   262|}
   263|