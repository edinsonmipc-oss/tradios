'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Upload, Trash2, X, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface GalleryImage {
  id: string
  url: string
  title: string
  description: string | null
  category: string
  created_at: string
}

const categories = ['all', 'electrical', 'plumbing', 'building', 'landscaping', 'other']

export default function GalleryPage() {
  const supabase = createClient()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'other',
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchImages = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('gallery')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (category !== 'all') {
      query = query.eq('category', category)
    }

    const { data } = await query
    if (data) setImages(data as GalleryImage[])
    setLoading(false)
  }

  useEffect(() => {
    fetchImages()
  }, [category])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile || !uploadForm.title.trim()) {
      toast.error('File and title are required')
      return
    }

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setUploading(false)
      return
    }

    const fileExt = uploadFile.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('gallery')
      .upload(fileName, uploadFile)

    if (uploadError) {
      toast.error(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('gallery')
      .getPublicUrl(fileName)

    const { error: dbError } = await supabase.from('gallery').insert({
      user_id: user.id,
      url: publicUrl,
      title: uploadForm.title.trim(),
      description: uploadForm.description.trim() || null,
      category: uploadForm.category,
    })

    setUploading(false)
    if (dbError) {
      toast.error(dbError.message)
    } else {
      toast.success('Image uploaded!')
      setShowUpload(false)
      setUploadFile(null)
      setUploadForm({ title: '', description: '', category: 'other' })
      fetchImages()
    }
  }

  const handleDelete = async (id: string, url: string) => {
    if (!confirm('Delete this image?')) return

    const { error } = await supabase.from('gallery').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Image deleted')
      fetchImages()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gallery</h1>
          <p className="mt-1 text-sm text-muted">Showcase your past work</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4" /> Upload Image
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-primary text-white'
                : 'text-muted hover:text-foreground hover:bg-card'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <p className="text-center text-sm text-muted py-12">Loading...</p>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20">
          <ImageIcon className="mb-3 h-12 w-12 text-muted/50" />
          <p className="text-sm text-muted">No images yet</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="h-4 w-4" /> Upload your first image
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={img.url}
                  alt={img.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-sm font-medium text-white truncate">{img.title}</p>
                {img.description && (
                  <p className="text-xs text-white/80 truncate">{img.description}</p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="rounded bg-white/20 px-2 py-0.5 text-xs text-white">
                    {img.category}
                  </span>
                  <button
                    onClick={() => handleDelete(img.id, img.url)}
                    className="rounded-full bg-red-500/80 p-1 text-white hover:bg-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Image">
        <form onSubmit={handleUpload} className="space-y-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background p-8 transition-colors hover:border-primary/50"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadFile ? (
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{uploadFile.name}</p>
                <p className="text-xs text-muted">
                  {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setUploadFile(null)
                  }}
                  className="mt-2 text-xs text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-muted" />
                <p className="text-sm text-muted">Click to select an image</p>
                <p className="text-xs text-muted/70 mt-1">PNG, JPG, WebP up to 10MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>
          <Input
            id="gallery-title"
            label="Title *"
            placeholder="e.g. Kitchen Reno - Job #42"
            value={uploadForm.title}
            onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Description</label>
            <textarea
              value={uploadForm.description}
              onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Brief description..."
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">Category</label>
            <select
              value={uploadForm.category}
              onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
              <option value="building">Building</option>
              <option value="landscaping">Landscaping</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowUpload(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={uploading}>
              Upload
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
