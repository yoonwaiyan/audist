import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SetupShell from '../../components/layout/SetupShell'
import AppLogo from '../../components/ui/AppLogo'
import WizardStepper from '../../components/ui/WizardStepper'
import Step1Permissions from './steps/Step1Permissions'
import Step2SaveLocation from './steps/Step2SaveLocation'
import Step3LanguageModel from './steps/Step3LanguageModel'

const STEPS = ['Permissions', 'Save Location', 'Language Model']

export default function Onboarding(): React.JSX.Element {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = (): void => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      navigate('/')
    }
  }

  const handleBack = (): void => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  const handleFinish = (): void => {
    navigate('/')
  }

  return (
    <SetupShell>
      <div className="flex flex-col items-center gap-8 w-full py-8">
        {/* Logo */}
        <AppLogo size="md" showWordmark />

        {/* Stepper */}
        <WizardStepper steps={STEPS} currentStep={currentStep} />

        {/* Step content */}
        {currentStep === 0 && (
          <Step1Permissions onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 1 && (
          <Step2SaveLocation onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 2 && (
          <Step3LanguageModel onNext={handleFinish} onBack={handleBack} />
        )}
      </div>
    </SetupShell>
  )
}
