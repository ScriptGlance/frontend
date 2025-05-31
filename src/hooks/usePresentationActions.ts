import {useCallback, useState} from "react";
import presentationsRepository, {InvitationResponse, Presentation} from "../api/repositories/presentationsRepository";
import {useAuth} from "./useAuth";
import {Role} from "../types/role";
import {DEFAULT_ERROR_MESSAGE} from "../contstants";

export function usePresentationMutations(presentationId?: number) {
    const { getToken } = useAuth();

    const [updateLoading, setUpdateLoading] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [updatedPresentation, setUpdatedPresentation] = useState<Presentation | null>(null);

    const updateName = async (name: string) => {
        try {
            setUpdateLoading(true); setUpdateError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            if (!presentationId) throw new Error("presentationId required");
            const updated = await presentationsRepository.updatePresentationName(token, presentationId, name);
            setUpdatedPresentation(updated);
            return updated;
        } catch (e: any) {
            setUpdateError(e.message || DEFAULT_ERROR_MESSAGE); throw e;
        } finally { setUpdateLoading(false); }
    };

    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const deletePresentation = async () => {
        try {
            setDeleteLoading(true); setDeleteError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            if (!presentationId) throw new Error("presentationId required");
            await presentationsRepository.deletePresentation(token, presentationId);
        } catch (e: any) {
            setDeleteError(e.message || DEFAULT_ERROR_MESSAGE); throw e;
        } finally { setDeleteLoading(false); }
    };

    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [invitation, setInvitation] = useState<InvitationResponse | null>(null);

    const invite = async () => {
        try {
            setInviteLoading(true); setInviteError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            if (!presentationId) throw new Error("presentationId required");
            const res = await presentationsRepository.inviteParticipant(token, presentationId);
            setInvitation(res);
            return res;
        } catch (e: any) {
            setInviteError(e.message || DEFAULT_ERROR_MESSAGE); throw e;
        } finally { setInviteLoading(false); }
    };

    return {
        updateName, updateLoading, updateError, updatedPresentation,
        deletePresentation, deleteLoading, deleteError,
        invite, inviteLoading, inviteError, invitation,
    };
}

export function usePresentationGlobalActions() {
    const { getToken } = useAuth();

    const [acceptLoading, setAcceptLoading] = useState(false);
    const [acceptError, setAcceptError] = useState<string | null>(null);

    const acceptInvitation = useCallback(async (invitationToken: string) => {
        try {
            setAcceptLoading(true); setAcceptError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            return await presentationsRepository.acceptInvitation(token, invitationToken);
        } catch (e: any) {
            setAcceptError(e.message || DEFAULT_ERROR_MESSAGE); throw e;
        } finally { setAcceptLoading(false); }
    }, [getToken]);
    const [deleteParticipantLoading, setDeleteParticipantLoading] = useState(false);
    const [deleteParticipantError, setDeleteParticipantError] = useState<string | null>(null);

    const deleteParticipant = async (participantId: number) => {
        try {
            setDeleteParticipantLoading(true); setDeleteParticipantError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            await presentationsRepository.deleteParticipant(token, participantId);
        } catch (e: any) {
            setDeleteParticipantError(e.message || DEFAULT_ERROR_MESSAGE); throw e;
        } finally { setDeleteParticipantLoading(false); }
    };

    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createdPresentation, setCreatedPresentation] = useState<Presentation | null>(null);

    const createPresentation = useCallback(async () => {
        try {
            setCreateLoading(true); setCreateError(null);
            const token = getToken(Role.User);
            if (!token) throw new Error("Not authenticated");
            const created = await presentationsRepository.createPresentation(token);
            setCreatedPresentation(created);
            return created;
        } catch (e: any) {
            setCreateError(e.message || DEFAULT_ERROR_MESSAGE); throw e;
        } finally { setCreateLoading(false); }
    }, [getToken]);


    return {
        acceptInvitation, acceptLoading, acceptError,
        deleteParticipant, deleteParticipantLoading, deleteParticipantError,
        createPresentation, createLoading, createError, createdPresentation,
    };
}