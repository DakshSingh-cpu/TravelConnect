'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { OnboardingPayload } from './schema'
import { validateStep } from './schema'
import {
  ONBOARD_STEP_NAMES,
  POST_WIZARD_STEPS,
  TOTAL_WIZARD_STEPS,
  stepIndexFromParam,
  type AllStepName,
} from './steps'

const DRAFT_KEY = 'tbo_onboarding_draft'
const CONTACT_PHONE_KEY = 'tbo_onboarding_contact_phone'

function readDraft(): Partial<OnboardingPayload> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Partial<OnboardingPayload>) : {}
  } catch {
    return {}
  }
}

function persistDraft(data: Partial<OnboardingPayload>): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function readContactPhone(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(CONTACT_PHONE_KEY)
  } catch {
    return null
  }
}

function persistContactPhone(phone: string): void {
  try {
    sessionStorage.setItem(CONTACT_PHONE_KEY, phone)
  } catch {
    /* ignore */
  }
}

export function clearOnboardingDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY)
    sessionStorage.removeItem(CONTACT_PHONE_KEY)
  } catch {
    /* ignore */
  }
}

export type OnboardingStateReturn = {
  data: Partial<OnboardingPayload>
  stepIndex: number
  stepName: AllStepName
  direction: number
  isWizardStep: boolean
  isValid: boolean
  updateField: <K extends keyof OnboardingPayload>(
    key: K,
    value: OnboardingPayload[K],
  ) => void
  updateFields: (fields: Partial<OnboardingPayload>) => void
  goNext: () => void
  goBack: () => void
  goTo: (stepName: AllStepName) => void
}

export function useOnboardingState(): OnboardingStateReturn {
  const router = useRouter()
  const searchParams = useSearchParams()
  const stepParam = searchParams.get('step')
  const allNames: AllStepName[] = [...ONBOARD_STEP_NAMES, ...POST_WIZARD_STEPS]
  const stepIndex = stepIndexFromParam(stepParam)
  const stepName = allNames[stepIndex] ?? 'destination'
  const isWizardStep = stepIndex < TOTAL_WIZARD_STEPS

  const [data, setData] = useState<Partial<OnboardingPayload>>(() => readDraft())
  const directionRef = useRef(1)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    const saved = readDraft()
    if (Object.keys(saved).length > 0) {
      setData(saved)
    }
  }, [])

  const goTo = useCallback(
    (target: AllStepName) => {
      const targetIdx = allNames.indexOf(target)
      directionRef.current = targetIdx > stepIndex ? 1 : -1
      setDirection(directionRef.current)
      const params = new URLSearchParams(window.location.search)
      params.set('step', target)
      router.push(`/onboard?${params.toString()}`)
    },
    [router, stepIndex, allNames],
  )

  const goNext = useCallback(() => {
    if (stepIndex >= allNames.length - 1) return
    goTo(allNames[stepIndex + 1])
  }, [stepIndex, allNames, goTo])

  const goBack = useCallback(() => {
    if (stepIndex <= 0) return
    goTo(allNames[stepIndex - 1])
  }, [stepIndex, allNames, goTo])

  const updateField = useCallback(
    <K extends keyof OnboardingPayload>(key: K, value: OnboardingPayload[K]) => {
      setData((prev) => {
        const next = { ...prev, [key]: value }
        persistDraft(next)
        if (key === 'contact' && typeof value === 'object' && value !== null && 'phone' in value) {
          persistContactPhone((value as { phone?: string }).phone ?? '')
        }
        return next
      })
    },
    [],
  )

  const updateFields = useCallback((fields: Partial<OnboardingPayload>) => {
    setData((prev) => {
      const next = { ...prev, ...fields }
      persistDraft(next)
      if (fields.contact?.phone) {
        persistContactPhone(fields.contact.phone)
      }
      return next
    })
  }, [])

  const isValid = useMemo(() => {
    if (!isWizardStep) return true
    return validateStep(stepIndex, data)
  }, [stepIndex, data, isWizardStep])

  return {
    data,
    stepIndex,
    stepName,
    direction,
    isWizardStep,
    isValid,
    updateField,
    updateFields,
    goNext,
    goBack,
    goTo,
  }
}
