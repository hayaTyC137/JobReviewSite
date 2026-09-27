import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { platformApi } from '../api/client'
import type { EmployeeProfile } from '../api/types'
import { useAuth } from '../auth/authContext'
import { CabinetLayout } from '../components/cabinet/CabinetLayout'
import { ErrorNote, LoadingBlock } from '../components/cabinet/ui'
import { errorText } from '../lib/cabinet'
import { ComplaintDialog } from '../components/ComplaintDialog'
import { EmployeeCard } from '../components/employee/EmployeeCard'

/** Карточка сотрудника глазами работодателя или модератора (доступ проверяет бэкенд) */
export function EmployeePage() {
  const { userId } = useParams()
  const { token, user } = useAuth()
  // Результат помечен id сотрудника: при переходе к другому id старые данные сразу считаются «загрузкой»
  const [result, setResult] = useState<{ id: string | undefined; profile?: EmployeeProfile; error?: string }>({ id: undefined })
  const [complaintOpen, setComplaintOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    platformApi.employeeProfile(token, Number(userId))
      .then((value) => { if (!cancelled) setResult({ id: userId, profile: value }) })
      .catch((err) => { if (!cancelled) setResult({ id: userId, error: errorText(err) }) })
    return () => { cancelled = true }
  }, [token, userId])

  const current = result.id === userId ? result : { id: userId }
  const profile = current.profile ?? null
  const error = current.error ?? ''

  return (
    <CabinetLayout
      kicker="Карточка сотрудника"
      title={profile?.employee.displayName ?? 'Сотрудник'}
      subtitle="Данные внесены подтверждёнными представителями работодателей. Замечания показываются только после проверки модератором."
    >
      {error && <ErrorNote error={error} />}
      {!error && !profile && <LoadingBlock />}
      {profile && (
        <>
          <EmployeeCard profile={profile} onComplainUser={profile.ownProfile || !user ? undefined : () => setComplaintOpen(true)} />
          <ComplaintDialog
            target={complaintOpen ? { type: 'USER', id: profile.employee.id, label: profile.employee.displayName } : null}
            onClose={() => setComplaintOpen(false)}
          />
        </>
      )}
    </CabinetLayout>
  )
}
