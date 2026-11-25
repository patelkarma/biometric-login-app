import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import ContactInput from '../components/ContactInput'
import { buildContact, emptyContact, validateContact } from '../lib/contact'
import { api } from '../lib/api'
import { savePendingOtp } from './verifyState'

const NAME_RE = /^\p{L}[\p{L} .'-]*$/u

function todayIso() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

function ageFrom(dob) {
  const b = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

function validate(form, contact) {
  const errors = {}
  if (!form.firstName.trim()) errors.firstName = 'First name is required.'
  else if (!NAME_RE.test(form.firstName.trim())) errors.firstName = 'Use letters only.'
  if (!form.surname.trim()) errors.surname = 'Surname is required.'
  else if (!NAME_RE.test(form.surname.trim())) errors.surname = 'Use letters only.'
  if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required.'
  else if (form.dateOfBirth > todayIso()) errors.dateOfBirth = 'Date of birth cannot be in the future.'
  else if (ageFrom(form.dateOfBirth) < 13) errors.dateOfBirth = 'You must be at least 13 years old.'
  else if (ageFrom(form.dateOfBirth) > 120) errors.dateOfBirth = 'Please enter a valid date of birth.'
  const contactError = validateContact(contact)
  if (contactError) errors.contact = contactError
  return errors
}

export default function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', surname: '', dateOfBirth: '' })
  const [contact, setContact] = useState(emptyContact)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    const v = validate(form, contact)
    setErrors(v)
    setServerError(null)
    if (Object.keys(v).length) return
    setBusy(true)
    try {
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
    } catch (err) {
      setServerError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <header className="form-head">
        <h2>Create your account</h2>
        <p>It takes less than a minute. No password needed.</p>
      </header>

      <form onSubmit={submit} noValidate>
        <div className="row-2">
          <div className="field">
            <label className="label" htmlFor="firstName">
              First name
            </label>
            <input
              id="firstName"
              className={`input ${errors.firstName ? 'is-invalid' : ''}`}
              autoComplete="given-name"
              placeholder="Karma"
              value={form.firstName}
              onChange={set('firstName')}
              autoFocus
            />
            {errors.firstName && <span className="field__error">{errors.firstName}</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="surname">
              Surname
            </label>
            <input
              id="surname"
              className={`input ${errors.surname ? 'is-invalid' : ''}`}
              autoComplete="family-name"
              placeholder="Patel"
              value={form.surname}
              onChange={set('surname')}
            />
            {errors.surname && <span className="field__error">{errors.surname}</span>}
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="dob">
            Date of birth
          </label>
          <input
            id="dob"
            type="date"
            className={`input ${errors.dateOfBirth ? 'is-invalid' : ''}`}
            autoComplete="bday"
            max={todayIso()}
            min="1900-01-01"
            value={form.dateOfBirth}
            onChange={set('dateOfBirth')}
          />
          {errors.dateOfBirth && <span className="field__error">{errors.dateOfBirth}</span>}
        </div>

        <span className="label">Sign up with</span>
        <ContactInput value={contact} onChange={setContact} />
        {errors.contact && <span className="field__error field__error--tight">{errors.contact}</span>}

        {serverError && (
          <div className="alert alert--error" role="alert">
            {serverError}
          </div>
        )}

        <button className="btn btn--primary btn--block" disabled={busy}>
          {busy && <span className="spinner" />}
          Create account
        </button>
        <p className="hint">We&apos;ll send a 6-digit code to verify it&apos;s you.</p>
      </form>

      <p className="switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
