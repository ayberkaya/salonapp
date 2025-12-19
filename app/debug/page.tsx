import { createClient } from '@/lib/supabase/server'

export default async function DebugPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  let profile = null
  let profileError = null
  if (user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
    profileError = error
  }

  let salon = null
  let salonError = null
  if (profile) {
    const { data, error } = await supabase
      .from('salons')
      .select('*')
      .eq('id', profile.salon_id)
      .single()
    salon = data
    salonError = error
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-3xl font-bold">Debug Information</h1>
        
        <div className="space-y-6">
          {/* Auth User */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Authentication User</h2>
            {userError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">
                Error: {userError.message}
              </div>
            )}
            {user ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Created:</strong> {user.created_at}</p>
              </div>
            ) : (
              <p className="text-gray-500">No user logged in</p>
            )}
          </div>

          {/* Profile */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Profile</h2>
            {profileError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">
                Error: {profileError.message}
                <br />
                <code className="text-xs">{JSON.stringify(profileError, null, 2)}</code>
              </div>
            )}
            {profile ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> {profile.id}</p>
                <p><strong>Full Name:</strong> {profile.full_name}</p>
                <p><strong>Role:</strong> {profile.role}</p>
                <p><strong>Salon ID:</strong> {profile.salon_id}</p>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-red-600">❌ Profile not found!</p>
                {user && (
                  <div className="rounded-md bg-yellow-50 p-4">
                    <p className="mb-2 font-semibold">To fix this:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Go to Supabase Dashboard {'>'} Table Editor {'>'} profiles</li>
                      <li>Insert a row with:</li>
                      <li className="ml-4">id: <code className="bg-gray-100 px-1">{user.id}</code></li>
                      <li className="ml-4">salon_id: (get from salons table)</li>
                      <li className="ml-4">full_name: &quot;Salon Owner&quot;</li>
                      <li className="ml-4">role: &quot;OWNER&quot;</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Salon */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Salon</h2>
            {salonError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">
                Error: {salonError.message}
              </div>
            )}
            {salon ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> {salon.id}</p>
                <p><strong>Name:</strong> {salon.name}</p>
              </div>
            ) : (
              <p className="text-gray-500">No salon found</p>
            )}
          </div>

          {/* Tables Check */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Database Tables</h2>
            <div className="space-y-2 text-sm">
              <p>Check if these tables exist in Supabase:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>salons</li>
                <li>profiles</li>
                <li>customers</li>
                <li>visits</li>
                <li>visit_tokens</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

