import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1B2B4B',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  itemTextSelected: {
    fontWeight: '700',
    color: '#1D4ED8',
  },
  itemBalance: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  itemBalanceSelected: {
    color: '#1D4ED8',
  },
  itemBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  fieldCardError: {
    borderColor: '#EF4444',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fieldCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  fieldCardPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
});
