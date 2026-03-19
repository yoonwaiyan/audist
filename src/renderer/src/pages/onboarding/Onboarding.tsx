import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="h-screen w-screen bg-bg-base text-text-primary flex flex-col overflow-hidden">
      {/* macOS drag region */}
      <div className="absolute top-0 left-0 right-0 h-10 [-webkit-app-region:drag]" />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-8 w-full max-w-xl mx-auto px-8 pt-8 pb-8">
          <AppLogo size="md" showWordmark />
          <WizardStepper steps={STEPS} currentStep={currentStep} />

          {currentStep === 0 && (
            <Step1Permissions onNext={handleNext} />
          )}
          {currentStep === 1 && (
            <Step2SaveLocation onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 2 && (
            <Step3LanguageModel onNext={handleFinish} onBack={handleBack} />
          )}
        </div>
      </div>
    </div>
  )
}
