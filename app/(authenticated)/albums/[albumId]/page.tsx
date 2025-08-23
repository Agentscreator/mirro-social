// Generate static params for all possible album IDs
export function generateStaticParams() {
  // Since this uses mock data, we need to provide some example album IDs
  // In a real app, you'd fetch these from your database
  return [
    { albumId: '1' },
    { albumId: '2' },  
    { albumId: '3' },
    { albumId: '4' },
    { albumId: '5' },
    // Add more IDs as needed for your mock data
  ]
}

// Dynamic import to avoid mixing server and client components
import dynamic from 'next/dynamic'

const AlbumPageClient = dynamic(() => import('./AlbumPageClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading album...</p>
      </div>
    </div>
  )
})

export default function AlbumPage({ params }: { params: { albumId: string } }) {
  return <AlbumPageClient params={params} />
}