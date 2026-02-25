<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    /**
     * Kullanıcının bu isteği yapmaya yetkisi var mı?
     */
    public function authorize(): bool
    {
        return true; // Şimdilik true bırakalım, auth middleware zaten kontrol edecek
    }

    /**
     * Doğrulama kuralları
     */
    public function rules(): array
    {
        return [
            'room_id'    => 'required|exists:rooms,id',
            'title'      => 'required|string|min:3|max:255',
            'start_time' => 'required|date|after_or_equal:today',
            'end_time'   => 'required|date|after:start_time', // Bitiş başlangıçtan sonra olmalı
            'color' => 'nullable|string|max:7',
        ];
    }

    /**
     * Hata mesajlarını özelleştirelim (Opsiyonel ama şık durur)
     */
    public function messages(): array
    {
        return [
            'start_time.after_or_equal' => 'Start time must be today or a future date.',
            'end_time.after'            => 'End time must be after start time.',
            'room_id.exists'            => 'Selected room does not exist.',
        ];
    }
}
