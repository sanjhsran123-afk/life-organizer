import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Button } from '../common/Button';

export const PersonModal: React.FC = () => {
  const { personModal, closePersonModal, addPerson, updatePerson, deletePerson } = useApp();
  const isEditing = Boolean(personModal.person?.id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (personModal.isOpen) {
      if (personModal.person) {
        setName(personModal.person.name || '');
        setPhone(personModal.person.phone || '');
        setEmail(personModal.person.email || '');
        setNotes(personModal.person.notes || '');
      } else {
        setName('');
        setPhone('');
        setEmail('');
        setNotes('');
      }
      setError('');
    }
  }, [personModal.isOpen, personModal.person]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Contact name is required');
      return;
    }

    if (isEditing && personModal.person) {
      updatePerson(personModal.person.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addPerson({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    closePersonModal();
  };

  return (
    <Modal
      isOpen={personModal.isOpen}
      onClose={closePersonModal}
      title={isEditing ? 'Edit Contact' : 'Add New Contact'}
      subtitle={
        isEditing
          ? 'Update contact information and details'
          : 'Create a person profile to track money lent and borrowed'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. Rahul Sharma"
          error={error}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number (Optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />

          <Input
            label="Email Address (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rahul@example.com"
          />
        </div>

        <Textarea
          label="Notes / Relationship (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. College roommate, childhood friend, project partner..."
          rows={2}
        />

        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 gap-3">
          {isEditing && personModal.person ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                deletePerson(personModal.person!.id);
                closePersonModal();
              }}
            >
              Delete Contact
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={closePersonModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {isEditing ? 'Save Changes' : 'Add Contact'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
