import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import ContactInput from '../components/ContactInput'
import { Alert, Button, TextField } from '../components/ui'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { api } from '../lib/api'
import { buildContact, emptyContact } from '../lib/contact'
import { todayIso } from '../lib/format'
import { savePendingOtp } from '../lib/pendingOtp'
import { validateSignup } from '../lib/validation'

export default function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', surname: '', dateOfBirth: '' })
  const [contact, setContact] = useState(emptyContact)
  const [errors, setErrors] = useState({})
  const { busy, error: serverError, setError: setServerError, run } = useAsyncAction()

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  function submit(e) {
    e.preventDefault()
    const found = validateSignup(form, contact)
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length) return
    run(async () => {
      const res = await api('/auth/signup', {
        method: 'POST',
        body: {
          firstName: form.firstName.trim(),
          surname: form.surname.trim(),
          dateOfBirth: form.dateOfBirth,
          contactType: contact.type,
          contact: buildContact(contact),
        },
      })
      savePendingOtp({ ...res, flow: 'signup', firstName: form.firstName.trim() })
      navigate('/verify')
    })
  }

  return (
    <AuthLayout
      step={1}
      title={
        <>
          Join in three
          <br />
          easy steps.
        </>
      }
    >
      <header className="form-head">
        <h2>Create your account</h2>
        <p>No password. Ever.</p>
      </header>

      <form onSubmit={submit} noValidate>
        <div className="row-2">
          <TextField
            id="firstName"
            label="First name"
            error={errors.firstName}
            autoComplete="given-name"
            placeholder="Karma"
            value={form.firstName}
            onChange={set('firstName')}
            autoFocus
          />
          <TextField
            id="surname"
            label="Surname"
            error={errors.surname}
            autoComplete="family-name"
            placeholder="Patel"
            value={form.surname}
            onChange={set('surname')}
          />
        </div>

        <TextField
          id="dob"
          label="Date of birth"
          type="date"
          error={errors.dateOfBirth}
          autoComplete="bday"
          max={todayIso()}
          min="1900-01-01"
          value={form.dateOfBirth}
          onChange={set('dateOfBirth')}
        />

        <span className="label">Sign up with</span>
        <ContactInput value={contact} onChange={setContact} label="Sign up with" />
        {errors.contact && <span className="field__error field__error--tight">{errors.contact}</span>}

        <Alert>{serverError}</Alert>

        <Button block loading={busy} disabled={busy}>
          Continue
        </Button>
        <p className="hint">We&apos;ll send a 6-digit code to verify it&apos;s you.</p>
      </form>

      <p className="switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
